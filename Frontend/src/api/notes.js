// src/api/notes.js

import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const generateNotes = async ({ subject, topic, mode, file }) => {
  if (mode === "file") {
    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("topic", topic);
    formData.append("mode", mode);
    formData.append("file", file);

    const response = await axios.post(`${BASE_URL}/api/notes/generate`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await axios.post(`${BASE_URL}/api/notes/generate`, {
    subject,
    topic,
    mode,
  });
  return response.data;
};

export const saveNote = async (payload) => {
  const response = await axios.post(`${BASE_URL}/api/notes/save`, payload);
  return response.data;
};

export const fetchUserNotes = async (userId) => {
  const response = await axios.get(`${BASE_URL}/api/notes/${userId}`);
  return response.data;
};

export const fetchNoteById = async (id) => {
  const response = await axios.get(`${BASE_URL}/api/notes/single/${id}`);
  return response.data;
};

export const updateNote = async (id, payload) => {
  const response = await axios.put(`${BASE_URL}/api/notes/${id}`, payload);
  return response.data;
};

export const deleteNote = async (id) => {
  const response = await axios.delete(`${BASE_URL}/api/notes/${id}`);
  return response.data;
};