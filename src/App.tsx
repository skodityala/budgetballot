import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./views/Landing";
import Allocator from "./views/Allocator";
import Impact from "./views/Impact";
import Compare from "./views/Compare";
import About from "./views/About";
import { useScenario } from "./state/useScenario";

export default function App() {
  const scenario = useScenario();
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/allocate" element={<Allocator scenario={scenario} />} />
        <Route path="/impact" element={<Impact scenario={scenario} />} />
        <Route path="/compare" element={<Compare scenario={scenario} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
