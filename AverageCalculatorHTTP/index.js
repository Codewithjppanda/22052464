const express = require("express");
const axios = require("axios");
const app = express();
const port = 9876;

// Configuration
const WINDOW_SIZE = 10;
const BASE_URL = "http://20.244.56.144/evaluation-service";
const REQUEST_TIMEOUT = 500; // ms

// Store the window of numbers
let numberWindow = [];

// Authentication credentials
const authConfig = {
  email: "22052464@kiit.ac.in",
  name: "Jyotiprakash Panda",
  mobileNo: "8249324905",
  githubUsername: "Codewithjppanda",
  rollNo: "22052464",
  collegeName: "KIIT University",
  accessCode: "nwpwrZ",
};

// Access token storage
let accessToken = null;

// Function to get auth token
async function getAuthToken() {
  try {
    if (accessToken) return accessToken;

    const response = await axios.post(`${BASE_URL}/auth`, authConfig);
    accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error("Error getting auth token:", error.message);
    throw error;
  }
}

// Function to fetch numbers from the test server
async function fetchNumbers(type) {
  const endpoints = {
    p: "primes",
    f: "fibo",
    e: "even",
    r: "rand",
  };

  if (!endpoints[type]) {
    throw new Error("Invalid number type");
  }

  try {
    const token = await getAuthToken();
    const response = await axios.get(`${BASE_URL}/${endpoints[type]}`, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.numbers || [];
  } catch (error) {
    console.error(`Error fetching ${type} numbers:`, error.message);
    return [];
  }
}

// Function to update the window with new numbers
function updateWindow(newNumbers) {
  const prevWindow = [...numberWindow];

  // Add new unique numbers to the window
  for (const num of newNumbers) {
    if (!numberWindow.includes(num)) {
      if (numberWindow.length >= WINDOW_SIZE) {
        // Remove the oldest number
        numberWindow.shift();
      }
      numberWindow.push(num);
    }
  }

  return prevWindow;
}

// Function to calculate the average of the window
function calculateAverage() {
  if (numberWindow.length === 0) return 0;

  const sum = numberWindow.reduce((acc, curr) => acc + curr, 0);
  return parseFloat((sum / numberWindow.length).toFixed(2));
}

// Set up the main endpoint
app.get("/numbers/:numberid", async (req, res) => {
  try {
    const numberid = req.params.numberid.toLowerCase();

    // Verify that the numberid is valid
    if (!["p", "f", "e", "r"].includes(numberid)) {
      return res.status(400).json({ error: "Invalid number ID" });
    }

    // Fetch numbers from the test server
    const numbers = await fetchNumbers(numberid);

    // Update the window
    const prevWindow = updateWindow(numbers);

    // Calculate average
    const avg = calculateAverage();

    // Prepare the response
    const response = {
      windowPrevState: prevWindow,
      windowCurrState: [...numberWindow],
      numbers: numbers,
      avg: avg,
    };

    res.json(response);
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Average Calculator Microservice running on port ${port}`);
});