import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


import TimeSlot from "./TimeSlot";
import {
  GoogleMap,
  Marker,
  Autocomplete
} from "@react-google-maps/api";


import { supabase } from "../supabase";


const mapContainerStyle = {
  width: "100%",
  height: "400px"
};


// Future service area / autocomplete search area
const cairnsServiceArea = {
  south: -16.98,
  west: 145.70,
  north: -16.85,
  east: 145.85
};


// Default pickup location
// This can later be changed using setPickupLocation()
const defaultPickupLocation = {
  lat: -16.9189,
  lng: 145.7763
};

    // not necessary anymore
    // // Fake database response.     // Later this will come from your backend/Supabase.     // These are currently booked pickup times.
    // const bookedSlots = [
    //     "2026-07-19T19:00",
    //     "2026-07-22T20:15"
    // ];


function Booking({ closeBooking }) { // "destructure" closeBooking neatly

  const [bookedSlots, setBookedSlots] = useState([]);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerName, setCustomerName] = useState("");



  const [bookingConfirmed, setBookingConfirmed] = useState(false);


  //////////////////////////////////////////////////////////////

async function confirmBooking() {

  const { error } = await supabase
    .from("bookings")
    .insert([
      {
        pickup_time: pickupDateTime,
        customer_name: customerName,
        status: "confirmed"
      }
    ]);

  if (error) {
    console.log(error);
    return;
  }

  setBookingConfirmed(true);
}


///////////////////////////////////////////////////





  useEffect(() => {
    async function loadBookings() {
      const { data, error } = await supabase
        .from("bookings")
        .select("pickup_time");

      if (error) {
        console.log(error);
        return;
      }

      setBookedSlots(
        data.map(booking =>
          booking.pickup_time.slice(0,16)
        )
      );
    }
    loadBookings();
  }, []);
  

  // Obviously it;s important that this is initalized (scoped) in the Booking.jsx parent and passed down as a prop to TimeSlot.jsx
  const [ pickupDateTime, setPickupDateTime ] = useState(null);

  // This stuff will done in the TimeSlot.jsx directly now, so these are redundant: 
  //   /// time and date vars
  // const minimumBookingTime = new Date();
  // minimumBookingTime.setMinutes(
  //   minimumBookingTime.getMinutes()
  // );
  // minimumBookingTime.setMinutes(
  //   Math.ceil(minimumBookingTime.getMinutes() / 15) * 15
  // );
  // const startOfDay = new Date();
  // startOfDay.setHours(16, 0, 0, 0);
  // const endOfDay = new Date();
  // endOfDay.setHours(23, 45, 0, 0);
  // // time and date vars end


  // Boking panel toggle:
  const [ pickupTimeSelectorOpen, setPickupTimeSelectorOpen ] = useState(false);

  // location state
  const [ pickupLocation, setPickupLocation]  = useState( defaultPickupLocation );
  const [ selectedDestinationCoordinates, setSelectedDestinationCoordinates ] = useState(null);
  const [ destinationAutocompleteInstance, setDestinationAutocompleteInstance ] = useState(null);

  // other state
  const [ fare, setFare ] = useState(null);
  const [ numberOfPedicabs, setNumberOfPedicabs ] = useState(1);


  // Runs when the Google Maps Autocomplete component has finished creating its internal autocomplete object
  function handleDestinationAutocompleteLoad( autocompleteInstance ) {
    const cairnsServiceAreaObject =
      new window.google.maps.LatLngBounds(
        {
          lat: cairnsServiceArea.south,
          lng: cairnsServiceArea.west
        },
        {
          lat: cairnsServiceArea.north,
          lng: cairnsServiceArea.east
        }
      );

    // Tell Google Autocomplete to prefer Cairns results
    autocompleteInstance.setBounds(cairnsServiceAreaObject);
    // Store the Google Autocomplete object in React state so other functions can use it later
    setDestinationAutocompleteInstance(autocompleteInstance );

  }


  // Runs when the user selects a destination suggestion

  function handleDestinationPlaceSelectionChanged() {

    if (destinationAutocompleteInstance !== null) {

      const selectedDestination =
        destinationAutocompleteInstance.getPlace();


      if (selectedDestination.geometry) {

        setSelectedDestinationCoordinates({
          lat: selectedDestination.geometry.location.lat(),
          lng: selectedDestination.geometry.location.lng()
        });

      }

    }

  }

  function calculateFare( selectedDestinationCoordinates, numberOfPedicabs)
  {
    const distanceService =
      new window.google.maps.DistanceMatrixService();


    distanceService.getDistanceMatrix({

      origins: [
        pickupLocation
      ],

      destinations: [
        selectedDestinationCoordinates
      ],

      travelMode:
        window.google.maps.TravelMode.BICYCLING

    },

    (response, status) => {

      if (status === "OK") {

        const distanceInMeters =
          response.rows[0]
            .elements[0]
            .distance.value;


        const distanceInKilometres =
          distanceInMeters / 1000;


        const calculatedFare =
          distanceInKilometres * 15 * numberOfPedicabs;


        setFare(
          calculatedFare.toFixed(2)
        );

      }

    });

  }

  // is full expination of useeffect at the bottom of this file, read it
  useEffect(() => {

    if (selectedDestinationCoordinates) {
      calculateFare(
        selectedDestinationCoordinates,
        numberOfPedicabs
      );
    }

  }, [
    selectedDestinationCoordinates,
    numberOfPedicabs
  ]);



//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////

  return (

    <section className="content-box booking-box">

      <h2>Choose your destination</h2>

      <p>
        Starting Point:
        <strong> La Pizza Restaurant, Cairns Esplanade </strong><br></br>
        (Custom start points coming soon)
      </p>



        <Autocomplete
          onLoad={handleDestinationAutocompleteLoad}
          onPlaceChanged={handleDestinationPlaceSelectionChanged}
          options={{
            componentRestrictions: {
              country: "au"
            },
            strictBounds: false
          }}
        >

          <input
            type="text"
            placeholder="Where would you like to go?"
          />

        </Autocomplete>


        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={pickupLocation}
          zoom={15}
        >

          <Marker
            position={pickupLocation}
            label="Start"
          />


          {selectedDestinationCoordinates && (

            <Marker
              position={selectedDestinationCoordinates}
              label="End"
            />

          )}

        </GoogleMap>

          {selectedDestinationCoordinates && (
            <>
              <p>
                Fare: ${fare}
              </p>
            </>

          )}
         
          <label>
          <br></br>
            Number of Pedicabs: <br></br>
            (max 2 adults + 1 child / teen)

            <div className="pedicab-options">

              {[1, 2, 3, 4].map((number) => (

                <button
                  key={number}
                  type="button"
                  onClick={() => setNumberOfPedicabs(number)}
                  className={
                    numberOfPedicabs === number
                      ? "selected"
                      : ""
                  }
                >
                  {number}
                </button>

              ))}

            </div>

          </label>

          <br></br>
          <label>
            Pickup date and time: <br></br>


          {/* <DatePicker /// old - delete!!!!!!!!!!
            selected={pickupDateTime}
            onChange={(date) => setPickupDateTime(date)}
            showTimeSelect
            timeIntervals={15}
            minDate={minimumBookingTime}
            timeCaption="Time"
            minTime={
              pickupDateTime &&
              pickupDateTime.toDateString() === minimumBookingTime.toDateString()
                ? minimumBookingTime
                : startOfDay
            }
            maxTime={endOfDay}
            dateFormat="dd/MM/yyyy h:mm aa"
          /> */}

          <button onClick={() => setPickupTimeSelectorOpen(true)}  >
            Pickup date and time
          </button>

         
          {pickupTimeSelectorOpen && (
            <TimeSlot
              setPickupDateTime={setPickupDateTime}
              bookedSlots={bookedSlots}
            />
          )}


          </label>

          <br></br>


      <button onClick={closeBooking}> Cancel </button>
      {/*  the onClick syntax looks a bit wierder than normal callback, because it's jsx*/}

      <button onClick={() => setShowCustomerDetails(true)}> Continue </button>

      {showCustomerDetails && (
        <div className="booking-box">

          <h3>Your name</h3>

          <input
            type="text"
            placeholder="Enter your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

        </div>
      )}
      

      {showCustomerDetails && !bookingConfirmed && (

        <button
          onClick={confirmBooking}
          disabled={!customerName || !pickupDateTime}
        >
          Confirm Booking
        </button>

      )}

      {bookingConfirmed && (

  <div className="booking-confirmed">

    <h3>Booking Confirmed!</h3>

    <p>
      Thanks {customerName}, your pedicab has been booked for{" "}
      {new Date(pickupDateTime).toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}
    </p>

    <button onClick={() => window.location.href = "/"}>
      Go Home
    </button>

  </div>

)}



    </section>

  );

}


export default Booking;





// this useEffect is triggered by selectedDestinationCoordinates being changed, which should only be changed using the setSelectedDestinationCoordinates usestate state hook function, changing state this way allows react to re-render only the part of the webpage that contains the changed state 

// better worded:
// This useEffect runs whenever selectedDestinationCoordinates changes.
//
// selectedDestinationCoordinates should normally only be changed using
// the setSelectedDestinationCoordinates state updater function.
//
// Calling the state updater tells React that state has changed,
// causing the Booking component to re-render.
//
// React then compares the new output with the previous output and
// updates only the necessary parts of the actual webpage (DOM).

// IMPPORTANT: useEffect runs after the render finishes, not during the render.


// Deeper explinatioin:
// State changes
//       ↓
// React re-renders component
//       ↓
// "Render" = React takes the current state, props, and any calculations
// in your component function, runs the component code, and produces a
// new JSX description of what the UI should look like.
//       ↓
// React compares old JSX vs new JSX
//       ↓
// React checks the previous JSX description against the new JSX description
// to determine what actually changed.
//       ↓
// React updates the DOM (only what changed)
//       ↓
// React tells the browser to update only the necessary HTML elements
// on the page, rather than rebuilding the entire webpage.
//       ↓
// useEffect runs (if its dependencies changed)
//       ↓
// React runs any side-effect functions that are watching the changed
// state values, for example:
// [selectedDestinationCoordinates] → calculateFare()