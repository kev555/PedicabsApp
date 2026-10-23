import { useEffect, useRef, useState } from "react";
import { cairnsServiceArea } from "../serviceArea";

function AutocompleteForCairns({ placeholder, disabled = false, autocompleteInstanceRef, onPlaceSelected, onInputChange, initialPlace }) {
    // App-specific: preserve the parent's selected address until this field is edited.
    const [inputValue, setInputValue] = useState(null);
    const displayedInputValue = inputValue ?? initialPlace?.address ?? initialPlace?.name ?? "";

    // Places/async plumbing: keep each field's suggestions, session, and request state independent.
    const [suggestions, setSuggestions] = useState([]);
    const callbacksRef = useRef({ onPlaceSelected, onInputChange });
    const sessionTokenRef = useRef(null);
    const requestSequenceRef = useRef(0);
    const skipSearchForValueRef = useRef(null);

    // React plumbing: async handlers use the latest parent callbacks without being recreated.
    useEffect(() => {
        callbacksRef.current = { onPlaceSelected, onInputChange };
    }, [onPlaceSelected, onInputChange]);

    // App-specific: let FareCalculator's quick-location buttons set the displayed text without searching it.
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

    // App-specific: notify FareCalculator that a manual edit invalidates the selected place and fare.
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

    // Places API plumbing plus app-specific behavior: debounce lookups, enforce Cairns bounds,
    // and ignore responses made stale by edits or quick picks.
    useEffect(() => {
        if (skipSearchForValueRef.current === displayedInputValue) {
            skipSearchForValueRef.current = null;
            return undefined;
        }
        if (inputValue === null || disabled || !displayedInputValue.trim()) return undefined;

        const requestSequence = requestSequenceRef.current;
        const timer = window.setTimeout(async () => {
            try {
                const placesLibrary = window.google.maps.places;
                sessionTokenRef.current ??= new placesLibrary.AutocompleteSessionToken();
                const { suggestions: placeSuggestions } =
                    await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                        input: displayedInputValue,
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
    }, [disabled, displayedInputValue, inputValue]);

    // Places API plumbing: fetch details for the chosen prediction; app-specific: adapt them to FareCalculator's place shape.
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

    // Custom UI: this is needed because the data API returns predictions but does not render an autocomplete input or list.
    return (
        <div className="places-autocomplete-container">
            <input
                type="text"
                className="custom-input"
                placeholder={placeholder}
                disabled={disabled}
                value={displayedInputValue}
                onChange={handleInputChange}
                onClick={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        requestSequenceRef.current += 1;
                        setSuggestions([]);
                    }
                }}
                aria-autocomplete="list"
                aria-expanded={suggestions.length > 0}
            />
            {displayedInputValue && !disabled && (
                <button
                    type="button"
                    className="places-autocomplete-clear-button"
                    aria-label="Clear location text"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setInputValue("")}
                >
                    ×
                </button>
            )}
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
