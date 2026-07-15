INSERT INTO usuarios (username, name, password, role)
VALUES ('admin', 'Administrador', 'admin', 'admin')
ON CONFLICT (username) DO UPDATE SET password = 'admin', role = 'admin';
