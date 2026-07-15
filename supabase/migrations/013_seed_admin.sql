-- Seeds the initial admin user with hashed password via RPC
SELECT criar_usuario_com_hash('admin', 'Administrador', 'admin', 'admin');
