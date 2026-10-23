import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

// Configure Maps once before any page requests a library.
setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    v: "weekly"
});

export { importLibrary };
