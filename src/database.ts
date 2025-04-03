import { config } from 'dotenv'
config()

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://zyuzhqcaehznxfwcuczd.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY as string
export default createClient(supabaseUrl, supabaseKey)