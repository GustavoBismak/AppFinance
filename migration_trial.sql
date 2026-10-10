-- Cria uma função segura (SECURITY DEFINER) para contar o total de usuários cadastrados
CREATE OR REPLACE FUNCTION public.get_total_users_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM auth.users;
$$;

-- Permite que qualquer usuário logado ou não consiga ler essa função
GRANT EXECUTE ON FUNCTION public.get_total_users_count() TO anon, authenticated;
