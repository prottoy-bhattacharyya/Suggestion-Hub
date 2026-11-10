import axios from "axios";

const api = axios.create({
  baseURL:
    (import.meta.env["VITE_API_URL"] as string | undefined) ??
    "http://192.168.1.138:8000",
  withCredentials: true,
  
});

export const API_URL = api.defaults.baseURL as string;

export default api;
