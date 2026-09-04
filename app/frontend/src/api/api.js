import axios from 'axios'

const BASE = 'https://nominex-1.onrender.com'

export const getStats        = ()       => axios.get(`${BASE}/stats`)
export const getPrograms     = ()       => axios.get(`${BASE}/programs`)
export const getNominations  = (id)     => axios.get(`${BASE}/nominations/${id}`)
export const generateShortlist = (data) => axios.post(`${BASE}/shortlist`, data)
export const saveShortlist   = (data)   => axios.post(`${BASE}/save`, data)
export const approveNomination = (data) => axios.post(`${BASE}/approve`, data)
export const coldStart       = (data)   => axios.post(`${BASE}/coldstart`, data)
