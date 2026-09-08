import { BrowserRouter, NavLink, Routes, Route } from "react-router-dom";

import FareCalculator from "./pages/FareCalculator";
import About from "./pages/About";
import Contact from "./pages/Contact";
import "./style.css";

function App() {
    return (
        <BrowserRouter>
            <div className="app">
                
                <header className="logo-box">
                  <img src="/images/logo.png" alt="Cairns Pedicab Logo" className="logo" />
                </header>

                <nav className="nav-container">
                    <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>About</NavLink>
                    <NavLink to="/farecalculator" className={({ isActive }) => isActive ? "active" : ""}>Book a Ride</NavLink>
                    <NavLink to="/contact" className={({ isActive }) => isActive ? "active" : ""}>Contact</NavLink>
                </nav>

                <main>
                    <Routes>
                        <Route path="/" element={<About />} />
                        <Route path="/farecalculator" element={<FareCalculator />} />
                        <Route path="/Contact" element={<Contact />} />
                    </Routes>
                </main>


                <footer className="site-footer">
                    <p>© 2026 Cairns Pedicabs</p>
                </footer>
                
                        </div>
        </BrowserRouter>
    );
}

export default App;