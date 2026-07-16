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
            onClick={() => setBookingVisibility(!bookingVisibility)}
            className={bookingVisibility ? "selected" : ""}
          >
            {bookingVisibility ? "Cancel" : "Book a Ride"}
          </button>

        </section>


        {bookingVisibility && (
          <Booking
            closeBooking={() => setBookingVisibility(false)}
          />
          //"This function will immediatly call the React state setter function setBookingVisibility (defined above)
          // changing the bookingVisibility state variable to false, which causes React to re-render.
          // destructure it in the Booking component main function: function Booking({ closeBooking })
          // Then use it at any Onclick etc in the Jsx at the bottom "return ()", just like a normal callback function and it will fire it
          // <button onClick={closeBooking}> -> the syntax looks a bit wierder than normal callback, because it's jsx (... mix of html and js)
        )}

        <About />

        <Test_Section />

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