/*
==================================================================
PART 1: CONFIGURATION
==================================================================
*/

// !!! 1. PASTE YOUR GOOGLE SHEET URLs HERE !!!
// Make sure they are the "Publish to the web" CSV links.

const CONTACTS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThTvGwKFZxIua6liXm6VUviZXu8FxEb4vMupUlHlXATPbVLMLYko-_K7CwY8bCTW3pn-K-gnmWMpia/pub?gid=204847259&single=true&output=csv";
const TEMPLATES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThTvGwKFZxIua6liXm6VUviZXu8FxEb4vMupUlHlXATPbVLMLYko-_K7CwY8bCTW3pn-K-gnmWMpia/pub?gid=1751353576&single=true&output=csv";


/*
==================================================================
PART 2: GLOBAL VARIABLES
==================================================================
*/

// We will store our data here once we fetch it
let allContacts = [];
let allTemplates = [];

// Get references to all the HTML elements we need to work with
const agencySelect = document.getElementById("agency-select");
const contactSelect = document.getElementById("contact-select");
const templateSelect = document.getElementById("template-select");

const subjectOutput = document.getElementById("output-subject");
const bodyOutput = document.getElementById("output-body");

const copySubjectBtn = document.getElementById("copy-subject-btn");
const copyBodyBtn = document.getElementById("copy-body-btn");

/*
==================================================================
PART 3: DATA FETCHING & INITIALIZATION
==================================================================
*/

// This runs as soon as the page loads
document.addEventListener("DOMContentLoaded", () => {
    loadContacts();
    loadTemplates();
});

// Fetches and processes the contacts CSV
async function loadContacts() {
    try {
        const response = await fetch(CONTACTS_URL);
        const csvText = await response.text();
        // Store our contacts in the global variable
        allContacts = csvToObjects(csvText);
        // Now, populate the first dropdown
        populateAgencyDropdown();
    } catch (error) {
        console.error("Error fetching contacts:", error);
        agencySelect.innerHTML = `<option value="">Error loading contacts</option>`;
    }
}

// Fetches and processes the templates CSV
async function loadTemplates() {
    try {
        const response = await fetch(TEMPLATES_URL);
        const csvText = await response.text();
        // Store our templates in the global variable
        allTemplates = csvToObjects(csvText);
        // Now, populate the template dropdown
        populateTemplateDropdown();
    } catch (error) {
        console.error("Error fetching templates:", error);
        templateSelect.innerHTML = `<option value="">Error loading templates</option>`;
    }
}

// This helper function turns CSV text into a nice array of objects
function csvToObjects(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines.shift().split(',').map(header => header.trim());
    
    return lines.map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index].trim();
            return obj;
        }, {});
    });
}

/*
==================================================================
PART 4: POPULATING DROPDOWNS
==================================================================
*/

// Populates the "Agency" dropdown with unique company names
function populateAgencyDropdown() {
    // Find all unique company names
    const companies = [...new Set(allContacts.map(contact => contact['COMPANY NAME']))];

    agencySelect.innerHTML = `<option value="">Select a company...</option>`; // <-- Optional: I changed the text
    companies.sort().forEach(company => {
        const option = new Option(company, company);
        agencySelect.add(option);
    });
}

// Populates the "Contact" dropdown based on the selected agency
function populateContactDropdown(selectedAgency) {
    // Filter contacts that match the selected agency
    const agencyContacts = allContacts.filter(contact => contact['COMPANY NAME'] === selectedAgency);
    
    contactSelect.innerHTML = `<option value="">Select a contact...</option>`;
    agencyContacts.forEach((contact, index) => {
        // We use the contact's 'Agent Name' for the text
        // We use the *index* of the contact in the allContacts array as its value
        const originalIndex = allContacts.indexOf(contact);
        const option = new Option(contact['AGENT NAME'], originalIndex);
        contactSelect.add(option);
    });
    // Enable the contact dropdown
    contactSelect.disabled = false;
}

// Populates the "Template" dropdown
function populateTemplateDropdown() {
    templateSelect.innerHTML = `<option value="">Select a template...</option>`;
    allTemplates.forEach((template, index) => {
        // We use the template's 'TemplateName' for the text
        // We use its index as the value
        const option = new Option(template.TemplateName, index);
        templateSelect.add(option);
    });
    // Enable the template dropdown
    templateSelect.disabled = false;
}

/*
==================================================================
PART 5: EVENT LISTENERS (Making the page interactive)
==================================================================
*/

// When an agency is chosen...
agencySelect.addEventListener("change", () => {
    // Reset the contact dropdown and output
    contactSelect.innerHTML = `<option value="">Select a contact...</option>`;
    contactSelect.disabled = true;
    clearOutput();
    
    const selectedAgency = agencySelect.value;
    if (selectedAgency) {
        populateContactDropdown(selectedAgency);
    }
});

// When a contact is chosen...
contactSelect.addEventListener("change", generateEmail);

// When a template is chosen...
templateSelect.addEventListener("change", generateEmail);

// Add click listeners for our copy buttons
copySubjectBtn.addEventListener("click", () => copyToClipboard(subjectOutput, copySubjectBtn));
copyBodyBtn.addEventListener("click", () => copyToClipboard(bodyOutput, copyBodyBtn));

/*
==================================================================
PART 6: THE "MAGIC" (Core Logic)
==================================================================
*/

// This function runs when both a contact and template are selected
function generateEmail() {
    const contactIndex = contactSelect.value;
    const templateIndex = templateSelect.value;

    // Make sure we have valid selections
    if (!contactIndex || !templateIndex) {
        clearOutput();
        return;
    }

    // Get the full data objects from our global arrays
    const selectedContact = allContacts[contactIndex];
    const selectedTemplate = allTemplates[templateIndex];

    // --- The Merge ---
    // 1. Start with the raw template subject and body
    let finalSubject = selectedTemplate.Subject;
    let finalBody = selectedTemplate.Body;

    // 2. Find all {placeholders} and replace them with contact data
    // This looks for anything like {Some Text}
    const placeholderRegex = /\{(.+?)\}/g;

    finalSubject = finalSubject.replace(placeholderRegex, (match, placeholderName) => {
        // If the contact has this property, use it. If not, keep the placeholder.
        return selectedContact[placeholderName] || match;
    });
    
    // We replace "<br>" (easy to type in Google Sheets) with actual newlines
    finalBody = finalBody.replace(/<br>/g, '\n');

    finalBody = finalBody.replace(placeholderRegex, (match, placeholderName) => {
        return selectedContact[placeholderName] || match;
    });

    // 3. Display the final text in the output boxes
    subjectOutput.value = finalSubject;
    bodyOutput.value = finalBody;
}

// Empties the output boxes
function clearOutput() {
    subjectOutput.value = "";
    bodyOutput.value = "";
}

// Helper function for the "Copy" buttons
function copyToClipboard(element, button) {
    if (!element.value) return; // Don't copy empty text
    
    element.select();
    document.execCommand("copy");
    
    // Give visual feedback
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied-feedback");
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("copied-feedback");
    }, 1500);

}


