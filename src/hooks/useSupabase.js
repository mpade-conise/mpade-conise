import { useContext } from 'react';
import { supabase } from '../services/supabaseClient';

const useSupabase = () => {
  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const getUserProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  };

  return { supabase, getSession, getUserProfile };
};

export default useSupabase;