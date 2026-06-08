// src/api/resources.js

import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const fetchResources = async (topic) => {
  const response = await axios.post(`${BASE_URL}/api/resources`, { topic });
  return response.data;
};