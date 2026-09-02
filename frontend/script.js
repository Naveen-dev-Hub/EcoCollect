// ============================================
// EcoCollect - script.js
// ============================================

document.addEventListener("DOMContentLoaded", function () {

    // ========================================
    // PICKUP FORM
    // ========================================

    const pickupForm =
        document.getElementById("pickupForm");

    if (pickupForm) {

        pickupForm.addEventListener(
            "submit",
            submitPickupRequest
        );
    }


    // ========================================
    // COLLECTION POINTS
    // ========================================

    loadCollectionPoints();

});


// ============================================
// SUBMIT PICKUP REQUEST
// ============================================

async function submitPickupRequest(event) {

    event.preventDefault();

    const pickupForm =
        document.getElementById("pickupForm");

    const submitButton =
        document.getElementById(
            "pickupSubmitButton"
        );

    const messageBox =
        document.getElementById(
            "pickupMessage"
        );


    // ========================================
    // CHECK LOGIN
    // ========================================

    const loggedIn =
        localStorage.getItem(
            "ecocollectLoggedIn"
        ) === "true"
        ||
        localStorage.getItem(
            "ecoCollectUserLoggedIn"
        ) === "true";


    if (!loggedIn) {

        messageBox.textContent =
            "Please login or create an account before submitting a pickup request.";

        messageBox.className =
            "message error-message";

        messageBox.style.display =
            "block";

        return;
    }


    // ========================================
    // FORM DATA
    // ========================================

    const formData =
        new FormData(pickupForm);


    // ========================================
    // BUTTON
    // ========================================

    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting...";

    messageBox.style.display =
        "none";


    try {

        console.log(
            "Sending pickup request..."
        );


        const response =
            await fetch(
                "http://localhost:5000/api/pickup",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        console.log(
            "Backend response:",
            data
        );


        if (
            response.ok &&
            data.success
        ) {

            messageBox.innerHTML =
                `
                Pickup request submitted successfully!<br>
                <br>
                <strong>Your Pickup Request ID:</strong><br>
                ${data.id || "Not available"}
                <br><br>
                Please save this ID to track your pickup.
                `;

            messageBox.className =
                "message success-message";

            messageBox.style.display =
                "block";


            pickupForm.reset();


            // Scroll to message

            messageBox.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


        } else {

            messageBox.textContent =
                data.message ||
                "Failed to submit pickup request.";

            messageBox.className =
                "message error-message";

            messageBox.style.display =
                "block";
        }


    } catch (error) {

        console.error(
            "Pickup request error:",
            error
        );


        messageBox.textContent =
            "Unable to connect to backend server. Make sure server.js is running.";

        messageBox.className =
            "message error-message";

        messageBox.style.display =
            "block";


    } finally {

        submitButton.disabled =
            false;

        submitButton.textContent =
            "Submit Pickup Request";
    }

}


// ============================================
// LOAD COLLECTION POINTS
// ============================================

async function loadCollectionPoints() {

    const container =
        document.getElementById(
            "collectionPoints"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "http://localhost:5000/api/collection-points"
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            container.innerHTML =
                `
                <p style="text-align:center;">
                    No collection points are currently available.
                </p>
                `;

            return;
        }


        const points =
            data.points || [];


        if (points.length === 0) {

            container.innerHTML =
                `
                <p style="text-align:center;">
                    No collection points are currently available.
                </p>
                `;

            return;
        }


        container.innerHTML = "";


        points.forEach(function (point) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "collection-point-card";


            const wasteTypes =
                Array.isArray(
                    point.wasteTypes
                )
                    ? point.wasteTypes.join(", ")
                    : point.wasteTypes || "";


            card.innerHTML =
                `
                <h3>
                    ${escapeHTML(
                        point.name || ""
                    )}
                </h3>

                <p>
                    <strong>Address:</strong>
                    ${escapeHTML(
                        point.address || ""
                    )}
                </p>

                <p>
                    <strong>Waste Types:</strong>
                    ${escapeHTML(
                        wasteTypes
                    )}
                </p>

                <span class="collection-status">
                    ${escapeHTML(
                        point.status || "Available"
                    )}
                </span>
                `;


            container.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Collection points error:",
            error
        );


        container.innerHTML =
            `
            <p style="text-align:center;">
                Unable to load collection points.
            </p>
            `;
    }

}


// ============================================
// HTML SECURITY
// ============================================

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}
// ============================================
// LOGIN / LOGOUT BUTTON
// ============================================

document.addEventListener("DOMContentLoaded", function () {

    const loginButton =
        document.getElementById("loginButton");

    const signupButton =
        document.getElementById("signupButton");

    const logoutButton =
        document.getElementById("logoutButton");


    const loggedIn =
        localStorage.getItem("ecocollectLoggedIn") === "true"
        ||
        localStorage.getItem("ecoCollectUserLoggedIn") === "true";


    // User is logged in
    if (loggedIn) {

        if (loginButton) {
            loginButton.style.display = "none";
        }

        if (signupButton) {
            signupButton.style.display = "none";
        }

        if (logoutButton) {
            logoutButton.style.display = "inline-block";
        }

    }


    // Logout
    if (logoutButton) {

        logoutButton.addEventListener("click", function () {

            localStorage.removeItem(
                "ecocollectLoggedIn"
            );

            localStorage.removeItem(
                "ecoCollectUserLoggedIn"
            );

            localStorage.removeItem(
                "ecoCollectUser"
            );

            alert("You have been logged out successfully.");

            window.location.href =
                "./login.html";

        });

    }

});