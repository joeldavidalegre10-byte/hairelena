import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { usersService, CreateUserData } from '../../services/users.service';
import { User } from '../../types';
import {
  Settings,
  Users,
  UserPlus,
  Shield,
  UserCheck,
  KeyRound,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const SystemSettingsView: React.FC = () => {
  const { user: currentUser, notify } = useApp();

  // Estado de lista de usuarios
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal para Crear Usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateUserData>({
    username: '',
    password: '',
    role: 'admin',
    full_name: '',
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');

  // Modal para Cambiar Contraseña de Usuario
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (err: any) {
      notify('Error al cargar la lista de usuarios: ' + err.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      username: '',
      password: '',
      role: 'admin',
      full_name: '',
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    const cleanUsername = createForm.username.trim();
    if (!cleanUsername) {
      setCreateError('Debes ingresar un nombre de usuario');
      return;
    }

    if (!createForm.password || createForm.password.trim().length < 3) {
      setCreateError('La contraseña debe tener al menos 3 caracteres');
      return;
    }

    try {
      setIsCreating(true);
      await usersService.create({
        username: cleanUsername,
        password: createForm.password.trim(),
        role: createForm.role,
        full_name: createForm.full_name?.trim() || cleanUsername,
      });

      notify(`Usuario «${cleanUsername}» creado exitosamente con rol ${createForm.role === 'admin' ? 'Administrador' : 'Cajero'}`, 'success');
      setIsCreateModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear el usuario');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      notify('No puedes desactivar tu propio usuario en sesión activa', 'error');
      return;
    }

    const newStatus = !targetUser.is_active;
    try {
      await usersService.update(targetUser.id, { is_active: newStatus });
      notify(`Usuario «${targetUser.username || targetUser.full_name}» ${newStatus ? 'activado' : 'desactivado'} correctamente`, 'info');
      await loadUsers();
    } catch (err: any) {
      notify('Error al cambiar estado del usuario: ' + err.message, 'error');
    }
  };

  const handleOpenPasswordModal = (targetUser: User) => {
    setSelectedUserForPassword(targetUser);
    setNewPassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    if (!newPassword || newPassword.trim().length < 3) {
      setPasswordError('La nueva contraseña debe tener al menos 3 caracteres');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await usersService.update(selectedUserForPassword.id, { password: newPassword.trim() });
      notify(`Contraseña actualizada para «${selectedUserForPassword.username || selectedUserForPassword.full_name}»`, 'success');
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al actualizar contraseña');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const fname = (u.full_name || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    return uname.includes(term) || fname.includes(term) || role.includes(term);
  });

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-200">
      {/* CABECERA PRINCIPAL */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Configuración del Sistema
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Administración de usuarios y administradores
        </p>
      </div>

      <div className="space-y-6 max-w-6xl">
        <div className="space-y-5">
          {/* BARRA SUPERIOR DE GESTIÓN DE USUARIOS */}
          <div className="bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre de usuario, nombre o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5b63f6] hover:bg-[#4f55e3] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Nuevo Usuario / Admin</span>
            </button>
          </div>

          {/* TABLA DE USUARIOS REGISTRADOS */}
          <div className="bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#1f2128] flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5b63f6]" />
                Usuarios Registrados en el Sistema
              </h3>
              <span className="text-xs text-slate-400">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'cuenta' : 'cuentas'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#14151b] border-b border-slate-200 dark:border-[#1f2128] text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Nombre Completo</th>
                    <th className="py-3 px-4">Rol en el Sistema</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a1b20]">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No se encontraron usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isAdmin = u.role === 'admin';
                      const isSelf = u.id === currentUser?.id;

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#161720] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isAdmin
                                  ? 'bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148]'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {u.username ? u.username[0].toUpperCase() : u.full_name[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-white font-mono block">
                                  {u.username || u.email.split('@')[0]}
                                </span>
                                {isSelf && (
                                  <span className="text-[9px] text-[#5b63f6] dark:text-[#818cf8] font-semibold">
                                    (Tú - Sesión actual)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {u.full_name}
                          </td>

                          <td className="py-3.5 px-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148]">
                                <Shield className="w-3 h-3" />
                                Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <UserCheck className="w-3 h-3" />
                                Cajero
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Inactivo
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPasswordModal(u)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1f2128] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] text-slate-600 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                                title="Cambiar contraseña"
                              >
                                <KeyRound className="w-3 h-3 text-[#5b63f6]" />
                                <span>Clave</span>
                              </button>

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                                    u.is_active
                                      ? 'border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                      : 'border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                  }`}
                                >
                                  {u.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PARA CREAR NUEVO USUARIO / ADMINISTRADOR                              */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="Crear Nuevo Administrador o Usuario"
          subtitle="Define el nombre de usuario, contraseña y rol de acceso para el nuevo personal"
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            {createError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Rol del Usuario
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, role: 'admin' })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    createForm.role === 'admin'
                      ? 'border-[#5b63f6] bg-indigo-50/60 dark:bg-[#1a1b2e] ring-1 ring-[#5b63f6]/40'
                      : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <Shield className="w-4 h-4 text-[#5b63f6]" />
                    <span>Administrador</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Acceso total a ventas, caja, márgenes, configuraciones y usuarios
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, role: 'cashier' })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    createForm.role === 'cashier'
                      ? 'border-[#5b63f6] bg-indigo-50/60 dark:bg-[#1a1b2e] ring-1 ring-[#5b63f6]/40'
                      : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Cajero</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Acceso al Punto de Venta, cobros de tickets y apertura/cierre de caja
                  </p>
                </button>
              </div>
            </div>

            {/* Campo Nombre de Usuario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre de Usuario <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="ej. juanadmin o lauracaja"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Este es el identificador con el que ingresará al sistema (sin correo electrónico).
              </p>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Ingresa la contraseña de acceso"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
            </div>

            {/* Campo Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre Completo (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. Juan Carlos Pérez"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1f2128]">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isCreating} className="bg-[#5b63f6] hover:bg-[#4f55e3] text-white">
                Crear Usuario
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA CAMBIAR CONTRASEÑA DE UN USUARIO                                */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && selectedUserForPassword && (
        <Modal
          isOpen={true}
          onClose={() => setIsPasswordModalOpen(false)}
          title={`Cambiar Contraseña: ${selectedUserForPassword.username || selectedUserForPassword.full_name}`}
          subtitle="Ingresa una nueva contraseña para esta cuenta"
          maxWidth="sm"
        >
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1f2128]">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isUpdatingPassword} className="bg-[#5b63f6] hover:bg-[#4f55e3] text-white">
                Guardar Contraseña
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};