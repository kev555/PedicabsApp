import { useState } from "react";

import {
  LoadScript
} from "@react-google-maps/api";

import Booking from "./components/Booking";
import About from "./components/About";
import Rides from "./components/Rides";
import Contact from "./components/Contact";
import Test_Section from "./components/Test_Section";
import "./style.css";


function App() {

  const [bookingVisibility, setBookingVisibility] = useState(false);
  // React state variable bookingVisibility and setter function setBookingVisibility
  // Only ever modify bookingVisibility with setBookingVisibility


  return (

    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}
      libraries={["places"]}
    >

      <header className="site-header">
        <img
          src="/images/logo.png"
          alt="Cairns Pedicabs logo"
          className="logo"
        />
      </header>


      <nav className="site-nav">
        <a href="#book">Book</a>
        <a href="#about">About</a>
        <a href="#rides">Rides</a>
        <a href="#contact">Contact</a>
      </nav>


      <main>

        <section className="content-box" id="book">

          <h2>Book a Ride</h2>

          <p>
            Relax, enjoy the breeze, and let us take you around Cairns CBD,
            the Esplanade and nearby attractions.
          </p>


          <button
            onClick={
              () => setBookingVisibility(!bookingVisibility)
              //"onClick will immediatly call React state setter function setBookingVisibility (defined above)
              // toggling the bookingVisibility state and causing React to re-render
            }
          >
            {bookingVisibility ? "Cancel" : "Book a Ride" // if booking panel is open change text to cancel so they know the button will also hide the booking panel
            } 
          </button>

        </section>

        
        {bookingVisibility && ( <Booking closeBooking={() => setBookingVisibility(false)} />
          // show/hide the booking component,
          // also pass down, as a "prop", a function for the child component to close itslef
          // the reason we send it as an already set up function is to "to control what the child component is allowed to do"
          // "Booking is only allowed to close itself, it doesn't need to know how visibility is managed."
          
        )}

        <About />
        {/* <Test_Section /> */}
        <Rides />
        <Contact />

      </main>


      <footer className="site-footer">

        <p>
          © 2026 Cairns Pedicabs
        </p>

      </footer>

    </LoadScript>

  );
}


export default App;