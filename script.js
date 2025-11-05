/*
==================================================================
PART 1: CONFIGURATION
==================================================================
*/

// Your specific Google Sheet URLs are now hard-coded
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
// NOTE: We still call it 'agencySelect' because its ID in the HTML is 'agency-select'
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
        if (!response.ok) throw new Error('Network response was not ok');
        const csvText = await response.text();
        
        allContacts = csvToObjects(csvText);
        
        // Check if data is empty or headers are wrong
        if (allContacts.length === 0 || !allContacts[0] || !allContacts[0]['COMPANY NAME']) {
            console.error("Data is empty or 'COMPANY NAME' column not found. Check parsed headers in the log above.");
            agencySelect.innerHTML = `<option value="">Check headers</option>`;
            return;
        }

        populateCompanyDropdown();
    } catch (error) {
        console.error("Error fetching contacts:", error);
        agencySelect.innerHTML = `<option value="">Error loading contacts</option>`;
    }
}

// Fetches and processes the templates CSV
async function loadTemplates() {
    try {
        const response = await fetch(TEMPLATES_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvText = await response.text();
        
        allTemplates = csvToObjects(csvText);
        
        if (allTemplates.length === 0 || !allTemplates[0] || !allTemplates[0]['TemplateName']) {
             console.error("Template data is empty or 'TemplateName' column not found.");
             templateSelect.innerHTML = `<option value="">Check templates</option>`;
             return;
        }

        populateTemplateDropdown();
    } catch (error) {
        console.error("Error fetching templates:", error);
        templateSelect.innerHTML = `<option value="">Error loading templates</option>`;
    }
}

// This helper function turns CSV text into a nice array of objects
function csvToObjects(csv) {
    // --- NEW ROBUST PARSER ---
    let csvData = csv;

    // Step 1: Remove Byte Order Mark (BOM) if present (invisible char)
    if (csvData.charCodeAt(0) === 0xFEFF) {
        csvData = csvData.substring(1);
    }
    
    // Step 2: Split into lines robustly (handles \n and \r\n)
    const lines = csvData.trim().split(/\r?\n/);
    
    if (lines.length < 2) { // Need at least 1 header line and 1 data line
        console.error("CSV data is empty or has no data rows.");
        return [];
    }

    // This function robustly splits a single CSV line
    const parseCsvLine = (line) => {
        const values = [];
        let inQuote = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuote && line[i+1] === '"') {
                    // Escaped quote ""
                    currentValue += '"';
                    i++; // Skip next quote
                } else {
                    // Start or end of quote
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                // End of a value
                values.push(currentValue.trim());
                currentValue = ''; // Reset for next value
            } else {
                // Regular character
                currentValue += char;
            }
        }
        // Add the last value
        values.push(currentValue.trim());
        return values;
    };

    // Step 3: Get headers
    const headerLine = lines.shift(); // Get first line
    const headers = parseCsvLine(headerLine).map(h => h.trim()); // Parse it
    
    // --- THIS IS OUR NEW DEBUGGING LINE ---
    console.log("Parsed CSV Headers:", headers);
    
    // Step 4: Map data lines to objects
    const result = [];
    lines.forEach(line => {
        if (!line) return; // Skip empty lines
        
        const values = parseCsvLine(line); // Parse data line
        
        if (values.length === headers.length) {
            const obj = headers.reduce((acc, header, index) => {
                acc[header] = values[index]; // Use header as-is (already trimmed)
                return acc;
            }, {});
            result.push(obj);
        } else {
            console.warn("Skipping line with mismatched columns (expected", headers.length, "got", values.length, "):", line);
        }
    });
    
    return result;
}

/*
==================================================================
PART 4: POPULATING DROPDOWNS
==================================================================
*/

// Populates the "Agency" dropdown with unique company names
function populateCompanyDropdown() {
    // Find all unique company names from the 'COMPANY NAME' column
    const companies = [...new Set(allContacts.map(contact => contact['COMPANY NAME']))];
    
    agencySelect.innerHTML = `<option value="">Select a company...</option>`;
    companies.sort().forEach(company => {
        if (company) { // Avoid adding blank entries
            const option = new Option(company, company);
            agencySelect.add(option);
        }
    });
}

// Populates the "Contact" dropdown based on the selected company
function populateContactDropdown(selectedCompany) {
    // Filter contacts that match the selected company name
    const companyContacts = allContacts.filter(contact => contact['COMPANY NAME'] === selectedCompany);
    
    contactSelect.innerHTML = `<option value="">Select a contact...</option>`;
    companyContacts.forEach(contact => {
        // We use the contact's 'AGENT NAME' for the text
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
        if (template.TemplateName) { // Avoid blank entries
            // We use the template's 'TemplateName' for the text
            // We use its index as the value
            const option = new Option(template.TemplateName, index);
            templateSelect.add(option);
        }
    });
    // Enable the template dropdown
    templateSelect.disabled = false;
}

/*
==================================================================
PART 5: EVENT LISTENERS (Making the page interactive)
==================================================================
*/

// When a company is chosen...
agencySelect.addEventListener("change", () => {
    // Reset the contact dropdown and output
    contactSelect.innerHTML = `<option value="">Select a contact...</option>`;
    contactSelect.disabled = true;
    clearOutput();
    
    const selectedCompany = agencySelect.value;
    if (selectedCompany) {
        populateContactDropdown(selectedCompany);
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
    document.execCommand("copy"); // Use this for broad compatibility
    
    // Give visual feedback
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied-feedback");
    
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("copied-feedback");
    }, 1500);
}
