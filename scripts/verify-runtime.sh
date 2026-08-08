#!/usr/bin/env bash
# BudgetBallot runtime verification — §1 endpoint checks + §2 SPA deep-link fallback.
# Boots the production server on an ephemeral port, exercises every endpoint,
# asserts on real response bodies, and tears down. Exit 0 = all green.
#
#   ./scripts/verify-runtime.sh
set -uo pipefail

PORT="${PORT:-8791}"
KEY="devkey"
BASE="http://127.0.0.1:${PORT}"
PASS=0
FAIL=0
SRV_PID=""

c_g=$'\033[32m'; c_r=$'\033[31m'; c_d=$'\033[2m'; c_0=$'\033[0m'

cleanup() { [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null; }
trap cleanup EXIT

ok()   { PASS=$((PASS+1)); printf "  %s✓%s %s\n" "$c_g" "$c_0" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  %s✗%s %s\n" "$c_r" "$c_0" "$1"; [ -n "${2:-}" ] && printf "      %sgot: %s%s\n" "$c_d" "$2" "$c_0"; }

# expect_status <label> <expected> <actual>
expect_status() {
  [ "$3" = "$2" ] && ok "$1 → $3" || bad "$1 → expected $2, got $3"
}
# expect_body <label> <needle> <body>
expect_body() {
  case "$3" in *"$2"*) ok "$1 (contains '$2')";; *) bad "$1 — missing '$2'" "$(printf '%.140s' "$3")";; esac
}

printf "\n\033[1mBudgetBallot runtime verification\033[0m\n"
printf "%sport %s · NODE_ENV=production · static SPA on%s\n" "$c_d" "$PORT" "$c_0"

# ---------------------------------------------------------------- boot --------
printf "\n\033[1m0. Boot\033[0m\n"
PORT="$PORT" BUDGETBALLOT_WRITE_KEY="$KEY" NODE_ENV=production \
  node server/index.js > /tmp/bb-server.log 2>&1 &
SRV_PID=$!

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/health" 2>/dev/null)
  [ "$code" = "200" ] && break
  if ! kill -0 "$SRV_PID" 2>/dev/null; then
    bad "server died on boot"; sed 's/^/      /' /tmp/bb-server.log; exit 1
  fi
  sleep 0.25
done
[ "$code" = "200" ] && ok "server booted (pid $SRV_PID)" || { bad "server never became ready"; sed 's/^/      /' /tmp/bb-server.log; exit 1; }

# --------------------------------------------------- §1 endpoint checks -------
printf "\n\033[1m1. GET /api/health\033[0m\n"
r=$(curl -s -w '\n%{http_code}' "${BASE}/api/health"); b=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
expect_status "health" 200 "$s"

printf "\n\033[1m2. GET /api/dataset — 12 services with carbon fields\033[0m\n"
r=$(curl -s -w '\n%{http_code}' "${BASE}/api/dataset"); b=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
expect_status "dataset" 200 "$s"
n=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);const a=j.services||j.dataset?.services||[];console.log(a.length)})' <<<"$b")
[ "$n" = "12" ] && ok "returns 12 services" || bad "expected 12 services, got $n"
# Real carbon contract per service: baselineEmissionsTonnes, carbonElasticity,
# carbonDirection ("reduces"|"increases"), carbonRationale.
carb=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d); const a=j.services||[];
  const need=["baselineEmissionsTonnes","carbonElasticity","carbonDirection","carbonRationale"];
  const miss=a.filter(s=>need.some(k=>s[k]===undefined));
  console.log(miss.length===0?"ALL":"MISSING:"+miss.map(m=>m.id).join(","));
})' <<<"$b")
[ "$carb" = "ALL" ] && ok "all 12 services carry the 4 carbon fields" || bad "carbon fields missing" "$carb"
dirs=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d);const ok=["reduces","increases","neutral"];
  const bad=j.services.filter(s=>!ok.includes(s.carbonDirection));
  const m={};j.services.forEach(s=>m[s.carbonDirection]=(m[s.carbonDirection]||0)+1);
  console.log(bad.length===0?"OK "+JSON.stringify(m):"BAD:"+bad.map(s=>s.id+"="+s.carbonDirection).join(","));
})' <<<"$b")
case "$dirs" in OK*) ok "carbonDirection valid everywhere ${dirs#OK }";; *) bad "invalid carbonDirection" "$dirs";; esac
[ -n "$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(j.baselineEmissionsTonnes??""))})' <<<"$b")" ] \
  && ok "dataset declares city-wide baselineEmissionsTonnes" || bad "missing city-wide baselineEmissionsTonnes"

printf "\n\033[1m3. POST /api/impact — outcomes + equity + carbon\033[0m\n"
ALLOC=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);const a=j.services||j.dataset?.services||[];const o={};a.forEach(s=>o[s.id]=s.baseline??s.baselineFunding??s.current??0);process.stdout.write(JSON.stringify({allocation:o}))})' <<<"$b")
r=$(curl -s -w '\n%{http_code}' -X POST "${BASE}/api/impact" -H 'Content-Type: application/json' -d "$ALLOC")
ib=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
expect_status "impact" 200 "$s"
keys=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(Object.keys(j).join(","))})' <<<"$ib")
printf "      %skeys: %s%s\n" "$c_d" "$keys" "$c_0"
# Assert on real nested values, not just the presence of key names.
shape=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const j=JSON.parse(d); const out=[];
  const sv=j.services||[];
  out.push(sv.length===12 ? "services=12" : "services="+sv.length+"!");
  const s0=sv[0]||{};
  out.push(typeof s0.projectedOutcome==="number" ? "projectedOutcome=num" : "projectedOutcome=MISSING");
  out.push(typeof s0.outcomeDelta==="number" ? "outcomeDelta=num" : "outcomeDelta=MISSING");
  out.push(["boosted","steady","cut"].includes(s0.fundingStatus) ? "fundingStatus="+s0.fundingStatus : "fundingStatus=MISSING");
  out.push(Array.isArray(s0.factors)&&s0.factors.length ? "factors="+s0.factors.length : "factors=MISSING");
  out.push(typeof j.equity?.score==="number" && typeof j.equity?.delta==="number" ? "equity=num" : "equity=MISSING");
  const c=j.carbon||{};
  const cOk=["baselineTonnes","projectedTonnes","deltaTonnes"].every(k=>typeof c[k]==="number") && Array.isArray(c.services) && c.services.length===12;
  out.push(cOk ? "carbon=full(12 svc)" : "carbon=MISSING");
  console.log(out.join(" "));
})' <<<"$ib")
printf "      %s%s%s\n" "$c_d" "$shape" "$c_0"
case "$shape" in *MISSING*|*"!"*) bad "impact payload shape" "$shape";;
  *) ok "impact: 12 outcomes + fundingStatus + factors + equity + carbon";; esac

# Behavioral check on the carbon sign convention (the tricky part of the model):
# funding a "reduces" service ABOVE baseline must LOWER its projected emissions,
# and an "increases" service must RAISE them.
SIGN=$(node -e '
  const b=JSON.parse(process.argv[1]);
  const up={}; b.services.forEach(s=>up[s.id]=Math.min(s.baselineFunding*1.25, s.maxEffectiveFunding));
  process.stdout.write(JSON.stringify({allocation:up}));
' "$b")
r2=$(curl -s -X POST "${BASE}/api/impact" -H 'Content-Type: application/json' -d "$SIGN")
verdict=$(node -e '
  const ds=JSON.parse(process.argv[1]), im=JSON.parse(process.argv[2]);
  const dir={}; ds.services.forEach(s=>dir[s.id]=s.carbonDirection);
  const wrong=[];
  im.carbon.services.forEach(s=>{
    const d=dir[s.serviceId], delta=s.deltaTonnes;
    if(d==="reduces"  && !(delta<0)) wrong.push(s.serviceId+":reduces but Δ="+delta);
    if(d==="increases"&& !(delta>0)) wrong.push(s.serviceId+":increases but Δ="+delta);
    if(d==="neutral"  && delta!==0)  wrong.push(s.serviceId+":neutral but Δ="+delta);
  });
  console.log(wrong.length?"WRONG "+wrong.join("; "):"OK signs correct on all 12 at +25% funding");
' "$b" "$r2")
case "$verdict" in OK*) ok "carbon sign convention: ${verdict#OK }";; *) bad "carbon sign convention" "$verdict";; esac

printf "\n\033[1m4. POST /api/scenarios WITHOUT key → 401\033[0m\n"
s=$(curl -s -o /tmp/bb-401.json -w '%{http_code}' -X POST "${BASE}/api/scenarios" \
     -H 'Content-Type: application/json' -d "{\"name\":\"no-auth\",$(sed 's/^{//' <<<"$ALLOC")")
expect_status "unauthenticated write" 401 "$s"

printf "\n\033[1m5. POST /api/scenarios WITH key → 201\033[0m\n"
BODY="{\"name\":\"verify-run\",$(sed 's/^{//' <<<"$ALLOC")"
r=$(curl -s -w '\n%{http_code}' -X POST "${BASE}/api/scenarios" \
     -H 'Content-Type: application/json' -H "Authorization: Bearer ${KEY}" -d "$BODY")
cb=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
expect_status "authenticated write" 201 "$s"
NEW_ID=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);console.log(j.id||j.scenario?.id||"")}catch(e){console.log("")}})' <<<"$cb")
[ -n "$NEW_ID" ] && ok "created id: $NEW_ID" || bad "no id in create response" "$(printf '%.140s' "$cb")"

printf "\n\033[1m6. GET /api/scenarios — includes the new write\033[0m\n"
r=$(curl -s -w '\n%{http_code}' "${BASE}/api/scenarios"); lb=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
expect_status "list" 200 "$s"
expect_body "list contains new id" "$NEW_ID" "$lb"

printf "\n\033[1m7. DELETE /api/scenarios/:id with key\033[0m\n"
s=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "${BASE}/api/scenarios/${NEW_ID}" -H "Authorization: Bearer ${KEY}")
case "$s" in 200|204) ok "delete → $s";; *) bad "delete → expected 200/204, got $s";; esac
s=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "${BASE}/api/scenarios/${NEW_ID}")
expect_status "delete without key" 401 "$s"
gone=$(curl -s "${BASE}/api/scenarios")
case "$gone" in *"$NEW_ID"*) bad "scenario still present after delete";; *) ok "scenario is gone after delete";; esac

# ------------------------------------------ §2 SPA deep-link fallback ---------
printf "\n\033[1m8. SPA static + deep-link refresh (§2 gate)\033[0m\n"
s=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/")
expect_status "GET /" 200 "$s"
# NOTE: the real client route is /allocate (not /allocator — App.tsx:16).
# Unknown paths hit React Router's "*" route and redirect to "/".
for route in /allocate /impact /compare /about; do
  r=$(curl -s -w '\n%{http_code}' "${BASE}${route}"); rb=$(sed '$d' <<<"$r"); s=$(tail -1 <<<"$r")
  if [ "$s" = "200" ]; then
    case "$rb" in *"<div id=\"root\""*|*"<div id=root"*) ok "deep-link ${route} → 200 + index.html";;
      *) bad "deep-link ${route} → 200 but not index.html";; esac
  else bad "deep-link ${route} → expected 200, got $s"; fi
done
js=$(node -e 'const fs=require("fs");const h=fs.readFileSync("dist/index.html","utf8");const m=h.match(/src="([^"]*\.js)"/);console.log(m?m[1]:"")')
if [ -n "$js" ]; then
  s=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}${js}")
  expect_status "hashed bundle ${js}" 200 "$s"
  cc=$(curl -s -o /dev/null -D - "${BASE}${js}" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')
  case "$cc" in *immutable*) ok "bundle is immutably cached";; *) bad "bundle Cache-Control" "$cc";; esac
fi
s=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/does-not-exist")
expect_status "unknown /api path is JSON 404 (not SPA)" 404 "$s"

# ---------------------------------------------------------------- summary -----
printf "\n\033[1mSummary\033[0m\n"
printf "  %spassed: %d%s   " "$c_g" "$PASS" "$c_0"
[ "$FAIL" -eq 0 ] && printf "failed: 0\n\n\033[1;32mALL RUNTIME CHECKS GREEN\033[0m\n\n" \
  || { printf "%sfailed: %d%s\n\n\033[1;31mRUNTIME FAILURES\033[0m\n\n" "$c_r" "$FAIL" "$c_0"; exit 1; }
