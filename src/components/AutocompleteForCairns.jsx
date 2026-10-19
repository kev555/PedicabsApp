import { useEffect, useRef, useState } from "react";
import { cairnsServiceArea } from "../serviceArea";

/*
 * Component history:
 *
 * This wrapper was already defined in commit 36c3faf0, but FareCalculator
 * did not render it at that time. FareCalculator imported and rendered the
 * @react-google-maps/api <Autocomplete /> component directly, so the wrapper
 * existed in the source tree without being part of that page's running flow.
 * The commit shows that it was unused there; it does not establish why it was
 * left that way.
 *
 * In commit 44a67eb7, the project moved to the newer Google Places API and
 * FareCalculator was changed to import and render this component for its
 * pickup and dropoff fields. The page now delegates prediction lookup,
 * suggestion display, place-detail fetching, and input display to this
 * component. FareCalculator still owns the booking-specific state: it receives
 * a selected place through onPlaceSelected and updates addresses, coordinates,
 * and fare-related state there.
 *
 * Current flow, from parent to user selection:
 * 1. FareCalculator renders one instance for pickup and one for dropoff,
 *    passing a different callback and imperative ref to each instance.
 * 2. This component keeps the typed input, suggestions, Places session token,
 *    and request sequence local to that instance. It shows initialPlace when
 *    there is no locally typed value yet.
 * 3. Typing calls the parent's onInputChange callback, invalidates previous
 *    requests, and schedules a restricted Places prediction lookup.
 * 4. Selecting a prediction fetches its details, converts it to the place
 *    object shape the parent handlers accept, then calls onPlaceSelected.
 * 5. The parent stores the selected location and may also set the input
 *    programmatically for a quick-location choice through autocompleteInstanceRef.
 *
 * The Places (New) data API is restricted to Australia and the Cairns service
 * area. The comments below describe the implementation details of each step.
 */

function AutocompleteForCairns({ placeholder, disabled = false, autocompleteInstanceRef, onPlaceSelected, onInputChange, initialPlace }) {
    // Keep text typed in this input separate from an optional initial value
    // supplied by the parent. null means "no user/programmatic edit yet"; in
    // that state, display the initial place's address, then name, then blank.
    // Once inputValue is a string, it takes precedence over initialPlace.
    const [inputValue, setInputValue] = useState(null);
    const displayedInputValue = inputValue ?? initialPlace?.address ?? initialPlace?.name ?? "";

    // Suggestions and Places session state are per component instance, so the
    // pickup and dropoff inputs can search independently.
    const [suggestions, setSuggestions] = useState([]);
    const callbacksRef = useRef({ onPlaceSelected, onInputChange });
    const sessionTokenRef = useRef(null);
    const requestSequenceRef = useRef(0);
    const skipSearchForValueRef = useRef(null);

    // Parent callbacks can change identity on a FareCalculator render. Keep
    // these refs current so the input handlers always call the latest callback
    // without rebuilding the widget's event handlers for every render.
    // Keep the widget's event handlers connected to the latest React callbacks.
    useEffect(() => {
        callbacksRef.current = { onPlaceSelected, onInputChange };
    }, [onPlaceSelected, onInputChange]);

    // Provide the parent a small imperative API instead of exposing this
    // component's internal state. FareCalculator uses setValue for quick picks:
    // the supplied value becomes visible, open suggestions are dismissed, and
    // the request counter invalidates any prediction response already in flight.
    // The skip marker lets the lookup effect below recognize that this displayed
    // text was filled programmatically rather than typed as a new search query.
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

    // A real user edit replaces any programmatic-skip marker, updates the
    // displayed text, and notifies the parent so it can clear the previously
    // selected coordinates/fare. Incrementing the sequence makes an older
    // asynchronous lookup or place-detail request unable to overwrite this edit.
    // Clearing the text also closes suggestions and ends the current Places
    // session so the next non-empty search starts with a fresh session token.
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

    // Search flow:
    // - A programmatically supplied value is shown but is not looked up again.
    // - Initial-place text is only a display value; while inputValue is null,
    //   the effect does not search for it.
    // - Disabled, empty, or whitespace-only inputs likewise do not search.
    // - For user-entered text, wait briefly before calling Places so rapid
    //   keystrokes are grouped into a single prediction request.
    //
    // The request sequence is captured before starting the timer and checked
    // again after the network response. If the user types, clears, selects a
    // place, or a quick pick is applied in the meantime, the sequence changes
    // and this response is discarded. Effect cleanup also cancels a debounce
    // timer that has not fired yet. The session token is reused for successive
    // prediction requests in this interaction and reset after selection/clear.
    // Debounce prediction lookups and ignore responses for outdated queries.
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

    // A prediction is not yet a complete place: fetch the fields the parent
    // needs before reporting the selection. The sequence check handles a user
    // making another choice or edit while this details request is pending.
    // The callback receives a compatibility-shaped object with geometry.location,
    // name, formatted_address, and address so FareCalculator can use the same
    // place handlers for Places results and its own quick-location objects.
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

    // Render a controlled input from displayedInputValue and a list of live
    // predictions. Each prediction button prevents mousedown from moving focus
    // away from the input before its click handler can fetch the selected place.
    // Escape closes the list and invalidates responses that might otherwise
    // reopen it after the user dismissed it.
    return (
        <div className="places-autocomplete-container">
            <input
                type="text"
                className="custom-input"
                placeholder={placeholder}
                disabled={disabled}
                value={displayedInputValue}
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
