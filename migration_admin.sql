-- migration_admin.sql
-- Tabela para definir usuários com privilégios administrativos
CREATE TABLE admin_users (
    user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem se ver" ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- Função segura para verificar se o usuário atual é um administrador
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Adiciona permissão para administradores lerem TODAS as assinaturas do sistema
CREATE POLICY "Admins veem todas as assinaturas" ON subscriptions FOR SELECT USING (is_admin());
