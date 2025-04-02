const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = 3000;
const BASE_URL = "http://20.244.56.144/evaluation-service";
const REQUEST_TIMEOUT = 3000;

const authConfig = {
  email: "22052464@kiit.ac.in",
  name: "Jyotiprakash Panda",
  rollNo: "22052464",
  accessCode: "nwpwrZ",
  clientID: "c481972c-f47d-4cb3-ab5a-b36aed6c6d2a",
  clientSecret: "rcMfTwgdXWnMZPeX",
};

let accessToken = null;

async function getAuthToken() {
  if (accessToken) return accessToken;
  try {
    const response = await axios.post(`${BASE_URL}/auth`, authConfig, {
      timeout: REQUEST_TIMEOUT,
      headers: { "Content-Type": "application/json" },
    });
    accessToken = response.data.access_token;
    console.log("Auth token received:", accessToken);
    return accessToken;
  } catch (error) {
    console.error(
      "Error getting auth token:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

async function getAuthHeaders() {
  const token = await getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

app.use(cors());

app.get("/api/users", async (req, res) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/users`, {
      timeout: REQUEST_TIMEOUT,
      headers,
    });
    const rawUsers = response.data.users;
    const usersArray = Object.entries(rawUsers).map(([id, name]) => ({ id, name }));
    res.json(usersArray);
  } catch (error) {
    console.error(
      "Error fetching users:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/users/top", async (req, res) => {
  try {
    const headers = await getAuthHeaders();
    const usersRes = await axios.get(`${BASE_URL}/users`, { timeout: REQUEST_TIMEOUT, headers });
    const rawUsers = usersRes.data.users;
    const usersArray = Object.entries(rawUsers).map(([id, name]) => ({ id, name }));
    const usersWithCounts = await Promise.all(
      usersArray.map(async (user) => {
        try {
          const postsRes = await axios.get(`${BASE_URL}/users/${user.id}/posts`, {
            timeout: REQUEST_TIMEOUT,
            headers,
          });
          const posts = postsRes.data.posts || [];
          return { ...user, postCount: posts.length };
        } catch (error) {
          console.error(
            `Error fetching posts for user ${user.id}:`,
            error.response ? error.response.data : error.message
          );
          return { ...user, postCount: 0 };
        }
      })
    );
    usersWithCounts.sort((a, b) => b.postCount - a.postCount);
    res.json(usersWithCounts.slice(0, 5));
  } catch (error) {
    console.error(
      "Error fetching top users:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to fetch top users" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const { type } = req.query;
    const headers = await getAuthHeaders();
    const postsRes = await axios.get(`${BASE_URL}/posts`, { timeout: REQUEST_TIMEOUT, headers });
    let posts = postsRes.data.posts || [];
    if (!Array.isArray(posts)) return res.status(500).json({ error: "Unexpected format for posts" });
    if (type === "latest") {
      posts.sort((a, b) => b.id - a.id);
      return res.json(posts);
    }
    if (type === "popular") {
      const postsWithCommentCounts = await Promise.all(
        posts.map(async (post) => {
          try {
            const commentsRes = await axios.get(`${BASE_URL}/posts/${post.id}/comments`, {
              timeout: REQUEST_TIMEOUT,
              headers,
            });
            const comments = commentsRes.data.comments || [];
            return { ...post, commentCount: comments.length };
          } catch (error) {
            console.error(
              `Error fetching comments for post ${post.id}:`,
              error.response ? error.response.data : error.message
            );
            return { ...post, commentCount: 0 };
          }
        })
      );
      const maxCommentCount = Math.max(...postsWithCommentCounts.map((p) => p.commentCount));
      return res.json(postsWithCommentCounts.filter((p) => p.commentCount === maxCommentCount));
    }
    res.json(posts);
  } catch (error) {
    console.error(
      "Error fetching posts:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.listen(port, () => {
  console.log(`Microservice running on port ${port}`);
});
