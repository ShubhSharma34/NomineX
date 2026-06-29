import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'

export const getStats        = ()       => axios.get(`${BASE}/stats`)
export const getPrograms     = ()       => axios.get(`${BASE}/programs`)
export const getNominations  = (id)     => axios.get(`${BASE}/nominations/${id}`)
export const generateShortlist = (data) => axios.post(`${BASE}/shortlist`, data)
export const saveShortlist   = (data)   => axios.post(`${BASE}/save`, data)
export const approveNomination = (data) => axios.post(`${BASE}/approve`, data)
export const coldStart       = (data)   => axios.post(`${BASE}/coldstart`, data)