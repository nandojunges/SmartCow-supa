import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vvgblwcreyyywrodbqyw.supabase.co'
const supabaseAnonKey = 'sb_publishable_zdgVdDY77muR1RxYpU6nTA_S_qcwY7g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
