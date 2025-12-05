
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
