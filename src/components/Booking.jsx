import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  GoogleMap,
  Marker,
  Autocomplete
} from "@react-google-maps/api";


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


function Booking({ closeBooking }) {

  /// time and date vars
const minimumBookingTime = new Date();

minimumBookingTime.setMinutes(
  minimumBookingTime.getMinutes()
);

minimumBookingTime.setMinutes(
  Math.ceil(minimumBookingTime.getMinutes() / 15) * 15
);

const [ pickupDateTime, setPickupDateTime ] = useState(minimumBookingTime);




const startOfDay = new Date();
startOfDay.setHours(16, 0, 0, 0);
const endOfDay = new Date();
endOfDay.setHours(23, 45, 0, 0);


const [pickupLocation, setPickupLocation] = useState( defaultPickupLocation );

const [ selectedDestinationCoordinates, setSelectedDestinationCoordinates ] = useState(null);

 const [ destinationAutocompleteInstance, setDestinationAutocompleteInstance ] = useState(null);

 const [ fare, setFare ] = useState(null);

 const [ numberOfPedicabs, setNumberOfPedicabs ] = useState(1);





  // Runs when the Google Maps Autocomplete component
  // has finished creating its internal autocomplete object
  function handleDestinationAutocompleteLoad(
    autocompleteInstance
  ) {

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
    autocompleteInstance.setBounds(
      cairnsServiceAreaObject
    );


    // Store the Google Autocomplete object in React state
    // so other functions can use it later
    setDestinationAutocompleteInstance(
      autocompleteInstance
    );

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
        Starting point:
        <strong> Cairns Esplanade</strong>
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


<DatePicker
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
/>


          </label>

          <br></br>


      <button>
        Continue
      </button>


      <button onClick={closeBooking}>
        Cancel
      </button>

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