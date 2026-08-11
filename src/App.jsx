import { useState } from "react";
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";
import { LoadScript } from "@react-google-maps/api";

import FareCalculator from "./pages/FareCalculator";
import Booking from "./pages/Booking";
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
                
                <header className="site-header">
                    <img src="/images/logo.png" alt="Cairns Pedicabs logo" className="logo" />
                </header>

                <nav className="site-nav">
                    <Link to="/">Welcome</Link>
                    <Link to="/FareCalculator">Fare Calculator</Link>
                    <Link to="/Booking">Book Now</Link>
                    <Link to="/contact">Contact</Link>
                </nav>

                <main>
                    <Routes>
                        <Route path="/" element={<About />} />
                        <Route path="/Booking" element={<Booking />} />
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