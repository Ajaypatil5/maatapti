/**
 * Handles form submission to Google Apps Script
 * @param {string} formId - The ID of the form element
 * @param {string} url - The Google Apps Script Web App URL
 * @param {string} formType - 'job' or 'recruiter'
 * @param {Object} [options] - Optional settings
 * @param {Function} [options.onSuccess] - Callback on success
 * @param {Function} [options.onError] - Callback on error
 */
export function attachFormHandler({ formId, url, formType, onSuccess, onError }) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form with ID "${formId}" not found.`);
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnContent = submitBtn.innerHTML;
        const originalBtnText = submitBtn.innerText;

        // 1. Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full mr-2"></span>Sending...`;
        submitBtn.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            // 2. Prepare Payload
            const formData = new FormData(form);
            const rawData = Object.fromEntries(formData.entries());

            // Helper to clean data if needed (e.g. trimming)
            const cleanData = {};
            for (const [key, value] of Object.entries(rawData)) {
                cleanData[key] = typeof value === 'string' ? value.trim() : value;
            }

            const payload = {
                formType,
                ...cleanData
            };
            
            // 3. Send Request
            // Google Apps Script requires 'no-cors' or specific handling for CORS.
            // However, 'no-cors' makes the response opaque (status 0, no JSON body).
            // To get a JSON response, we usually need the script to handle OPTIONS and return headers.
            // BUT standard fix for simple forms: treat Google Apps Script as form submission.
            // Actually, best practice for Apps Script API is usually:
            // 1. Content-Type: "text/plain;charset=utf-8" (avoids preflight sometimes)
            // 2. Or using FormData directly without JSON.
            // Let's try the text/plain hack first which often bypasses strict CORS preflight for simple POSTs,
            // or simply use 'application/x-www-form-urlencoded'.
            
            // Standard JSON POST that works with properly configured Apps Script (doGet/doPost):
            const response = await fetch(url, {
                method: 'POST',
                // Using text/plain prevents the browser from sending a preflight OPTIONS request
                // Apps Script can still parse the body with JSON.parse(e.postData.contents)
                headers: {
                  'Content-Type': 'text/plain;charset=utf-8', 
                },
                body: JSON.stringify(payload)
            });

            // 4. Parse JSON Response
            const result = await response.json();

            // 5. Handle Outcome
            if (result && result.success === true) { // "Show success message if response.success === true"
                // Success UI
                form.reset();
                showNotification(form, 'success', result.message || 'Submitted successfully!');
                if (onSuccess) onSuccess(result);
            } else {
                // Error UI
                throw new Error(result.message || 'Submission failed on server.');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            showNotification(form, 'error', error.message || 'Something went wrong. Please try again.');
            if (onError) onError(error);
        } finally {
            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    });
}

function showNotification(form, type, message) {
    // Remove existing notifications
    const existing = form.parentNode.querySelector('.form-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = `form-notification mt-4 p-4 rounded-lg text-sm font-medium ${
        type === 'success' 
        ? 'bg-green-50 text-green-700 border border-green-200' 
        : 'bg-red-50 text-red-700 border border-red-200'
    }`;
    div.innerHTML = `<div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    </div>`;

    form.insertAdjacentElement('afterend', div);

    // Auto dismiss after 5 seconds if success
    if (type === 'success') {
        setTimeout(() => div.remove(), 5000);
    }
}
