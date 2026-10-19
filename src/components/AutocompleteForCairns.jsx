import { useEffect, useRef, useState } from "react";

const cairnsServiceArea = {
    south: -16.98,
    west: 145.70,
    north: -16.85,
    east: 145.85
};

// The Places (New) data API restricts suggestions to Australia and the Cairns service area.

function AutocompleteForCairns({ placeholder, disabled = false, autocompleteInstanceRef, onPlaceSelected, onInputChange }) {
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const callbacksRef = useRef({ onPlaceSelected, onInputChange });
    const sessionTokenRef = useRef(null);
    const requestSequenceRef = useRef(0);
    const skipSearchForValueRef = useRef(null);

    // Keep the widget's event handlers connected to the latest React callbacks.
    useEffect(() => {
        callbacksRef.current = { onPlaceSelected, onInputChange };
    }, [onPlaceSelected, onInputChange]);

    // Expose a small value setter so quick-location selections can update the input.
    useEffect(() => {
        if (!autocompleteInstanceRef) return undefined;

        autocompleteInstanceRef.current = {
            setValue(value) {
                skipSearchForValueRef.current = value;
                setInputValue(value);
                setSuggestions([]);
                requestSequenceRef.current += 1;
            }
        };

        return () => {
            autocompleteInstanceRef.current = null;
        };
    }, [autocompleteInstanceRef]);

    function handleInputChange(event) {
        const value = event.target.value;
        skipSearchForValueRef.current = null;
        setInputValue(value);
        callbacksRef.current.onInputChange?.();
        requestSequenceRef.current += 1;

        if (!value.trim()) {
            setSuggestions([]);
            sessionTokenRef.current = null;
        }
    }

    // Debounce prediction lookups and ignore responses for outdated queries.
    useEffect(() => {
        if (skipSearchForValueRef.current === inputValue) {
            skipSearchForValueRef.current = null;
            return undefined;
        }
        if (disabled || !inputValue.trim()) return undefined;

        const requestSequence = requestSequenceRef.current;
        const timer = window.setTimeout(async () => {
            try {
                const placesLibrary = window.google.maps.places;
                sessionTokenRef.current ??= new placesLibrary.AutocompleteSessionToken();
                const { suggestions: placeSuggestions } =
                    await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                        input: inputValue,
                        includedRegionCodes: ["au"],
                        locationRestriction: cairnsServiceArea,
                        sessionToken: sessionTokenRef.current
                    });

                if (requestSequence === requestSequenceRef.current) {
                    setSuggestions(placeSuggestions.filter((suggestion) => suggestion.placePrediction));
                }
            } catch (error) {
                if (requestSequence === requestSequenceRef.current) {
                    setSuggestions([]);
                    console.error("Google Places failed to fetch autocomplete suggestions", error);
                }
            }
        }, 200);

        return () => window.clearTimeout(timer);
    }, [disabled, inputValue]);

    async function handleSuggestionSelected(prediction) {
        const requestSequence = ++requestSequenceRef.current;
        setSuggestions([]);

        try {
            const place = prediction.toPlace();
            await place.fetchFields({
                fields: ["location", "displayName", "formattedAddress"]
            });

            if (requestSequence !== requestSequenceRef.current) return;
            if (!place.location) {
                console.error("Selected place did not include a location.");
                return;
            }

            const address = place.formattedAddress || place.displayName || "";
            skipSearchForValueRef.current = address;
            setInputValue(address);
            sessionTokenRef.current = null;
            callbacksRef.current.onPlaceSelected?.({
                geometry: { location: place.location },
                name: place.displayName,
                formatted_address: place.formattedAddress,
                address
            });
        } catch (error) {
            console.error("Google Places failed to load the selected place", error);
        }
    }

    return (
        <div className="places-autocomplete-container">
            <input
                type="text"
                className="custom-input"
                placeholder={placeholder}
                disabled={disabled}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        requestSequenceRef.current += 1;
                        setSuggestions([]);
                    }
                }}
                aria-autocomplete="list"
                aria-expanded={suggestions.length > 0}
            />
            {suggestions.length > 0 && (
                <ul className="places-autocomplete-suggestions" role="listbox">
                    {suggestions.map((suggestion) => {
                        const prediction = suggestion.placePrediction;
                        const label = prediction.text.toString();
                        return (
                            <li key={prediction.placeId} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    className="places-autocomplete-suggestion"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSuggestionSelected(prediction)}
                                >
                                    {label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default AutocompleteForCairns;
