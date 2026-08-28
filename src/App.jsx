import { useState } from "react";
import { BrowserRouter, NavLink, Routes, Route } from "react-router-dom";
import { LoadScript } from "@react-google-maps/api";

import FareCalculator from "./pages/FareCalculator";
import About from "./pages/About";
import Contact from "./pages/Contact";
import "./style.css";

const libraries = ["places"];

function App() {
    const [bookingVisibility, setBookingVisibility] = useState(false);
    // React state variable bookingVisibility and setter function setBookingVisibility
    // Only ever modify bookingVisibility with setBookingVisibility

    return (
        <BrowserRouter>
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY} libraries={[libraries]}>
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
                        <Route path="/FareCalculator" element={<FareCalculator />} />
                        <Route path="/Contact" element={<Contact />} />
                    </Routes>
                </main>


                <footer className="site-footer">
                    <p>© 2026 Cairns Pedicabs</p>
                </footer>
                
              </div>

            </LoadScript>
        </BrowserRouter>
    );
}

export default App;