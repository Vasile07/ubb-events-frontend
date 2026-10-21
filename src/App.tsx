import { Link, Route, Routes } from "react-router-dom";

function Home() {
  return (
    <main>
      <h1>UBB Events home</h1>
      <p>Event management for UBB student organizations.</p>
    </main>
  );
}

export default function App() {
  return (
    <>
      <nav aria-label="Main navigation">
        <Link to="/">Home</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </>
  );
}
