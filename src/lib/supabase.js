// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cyyqfjsnlmhygouqajao.supabase.co'
const supabaseAnonKey = 'sb_publishable_c_GBAsJRXBCXreDe_G3RJQ_a-BLF_Mm'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)