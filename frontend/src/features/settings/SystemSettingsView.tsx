import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { usersService, CreateUserData } from '../../services/users.service';
import { User } from '../../types';
import { PermissionKey, ALL_PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS, PERMISSIONS, permissionsOf } from '../../config/permissions';
import { PermissionsPicker } from '../users/PermissionsPicker';
import {
  Settings,
  Users,
  UserPlus,
  Shield,
  UserCheck,
  KeyRound,
  AlertCircle,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const SystemSettingsView: React.FC = () => {
  const { user: currentUser, notify, refreshUser } = useApp();

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
    permissions: [...ROLE_DEFAULT_PERMISSIONS.admin],
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');

  // Modal para Editar Usuario (datos, rol y permisos)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{
    username: string;
    full_name: string;
    role: 'admin' | 'cashier';
    permissions: PermissionKey[];
  }>({ username: '', full_name: '', role: 'admin', permissions: [] });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');

  // Modal para Eliminar Usuario
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

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
      permissions: [...ROLE_DEFAULT_PERMISSIONS.admin],
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

    if (!createForm.permissions || createForm.permissions.length === 0) {
      setCreateError('Selecciona al menos un permiso para el usuario');
      return;
    }

    try {
      setIsCreating(true);
      await usersService.create({
        username: cleanUsername,
        password: createForm.password.trim(),
        role: createForm.role,
        full_name: createForm.full_name?.trim() || cleanUsername,
        permissions: createForm.permissions,
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

  const handleOpenEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditForm({
      username: targetUser.username || targetUser.email.split('@')[0],
      full_name: targetUser.full_name,
      role: targetUser.role === 'cashier' ? 'cashier' : 'admin',
      permissions: [...permissionsOf(targetUser)],
    });
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    const cleanUsername = editForm.username.trim();
    const cleanName = editForm.full_name.trim();
    if (!cleanUsername) {
      setEditError('El nombre de usuario no puede estar vacío');
      return;
    }
    if (!cleanName) {
      setEditError('El nombre completo no puede estar vacío');
      return;
    }
    if (editForm.permissions.length === 0) {
      setEditError('Selecciona al menos un permiso para el usuario');
      return;
    }

    try {
      setIsSavingEdit(true);
      await usersService.update(editingUser.id, {
        username: cleanUsername,
        full_name: cleanName,
        role: editForm.role,
        permissions: editForm.permissions,
      });

      // Si se editó la cuenta en uso, se refresca para que el menú refleje los cambios al instante
      if (editingUser.id === currentUser?.id) {
        await refreshUser();
      }

      notify(`Usuario «${cleanUsername}» actualizado correctamente`, 'success');
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar los cambios');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDeleteModal = (targetUser: User) => {
    setUserToDelete(targetUser);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    if (!deletePassword.trim()) {
      setDeleteError('Ingresa la contraseña de un administrador para confirmar');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      await usersService.remove(userToDelete.id, deletePassword);
      notify(`Usuario «${userToDelete.username || userToDelete.full_name}» eliminado`, 'success');
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'No se pudo eliminar el usuario');
    } finally {
      setIsDeleting(false);
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
          Administración de usuarios, roles y permisos de acceso
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
                    <th className="py-3 px-4">Permisos</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a1b20]">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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
                            {(() => {
                              const granted = permissionsOf(u);
                              const names = PERMISSIONS.filter((p) => granted.includes(p.key)).map((p) => p.label);
                              return (
                                <span
                                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-help"
                                  title={names.length ? names.join(' · ') : 'Sin acceso a ningún módulo'}
                                >
                                  {granted.length} de {ALL_PERMISSION_KEYS.length} módulos
                                </span>
                              );
                            })()}
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
                                onClick={() => handleOpenEditModal(u)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1f2128] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] text-slate-600 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                                title="Editar datos, rol y permisos"
                              >
                                <Pencil className="w-3 h-3 text-[#5b63f6]" />
                                <span>Editar</span>
                              </button>

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

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(u)}
                                  className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          subtitle="Define el nombre de usuario, contraseña, rol y los permisos que tendrá en el sistema"
          maxWidth="lg"
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
                  onClick={() => setCreateForm({ ...createForm, role: 'admin', permissions: [...ROLE_DEFAULT_PERMISSIONS.admin] })}
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
                    Trae todos los permisos marcados por defecto
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, role: 'cashier', permissions: [...ROLE_DEFAULT_PERMISSIONS.cashier] })}
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
                    Trae Punto de Venta, tickets y caja por defecto
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

            {/* Permisos del sistema */}
            <PermissionsPicker
              value={createForm.permissions || []}
              role={createForm.role}
              onChange={(next) => setCreateForm({ ...createForm, permissions: next })}
            />
            <p className="text-[10px] text-slate-400 -mt-2">
              El rol solo propone los permisos iniciales: puedes marcar o quitar los que quieras y cambiarlos después con «Editar».
            </p>

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
      {/* MODAL PARA EDITAR USUARIO (DATOS, ROL Y PERMISOS)                          */}
      {/* ========================================================================= */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={`Editar usuario: ${editingUser.username || editingUser.full_name}`}
          subtitle="Modifica sus datos, su rol y los módulos a los que puede acceder"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de Usuario <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#5b63f6]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#5b63f6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Rol</label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['admin', 'cashier'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, role: r })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      editForm.role === r
                        ? 'border-[#5b63f6] bg-indigo-50/60 dark:bg-[#1a1b2e] ring-1 ring-[#5b63f6]/40'
                        : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      {r === 'admin' ? (
                        <Shield className="w-4 h-4 text-[#5b63f6]" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                      )}
                      <span>{r === 'admin' ? 'Administrador' : 'Cajero'}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Cambiar el rol no modifica los permisos marcados abajo. Los cajeros no ven comisiones ni importes de caja.
              </p>
            </div>

            <PermissionsPicker
              value={editForm.permissions}
              role={editForm.role}
              lockedKeys={editingUser.id === currentUser?.id ? ['settings'] : []}
              onChange={(next) => setEditForm({ ...editForm, permissions: next })}
            />
            <p className="text-[10px] text-slate-400 -mt-2">
              Los cambios se aplican de inmediato en el servidor. Si la persona tiene el sistema abierto, verá el menú actualizado al recargar la página.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1f2128]">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSavingEdit} className="bg-[#5b63f6] hover:bg-[#4f55e3] text-white">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA ELIMINAR USUARIO                                                */}
      {/* ========================================================================= */}
      {userToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          title={`Eliminar usuario: ${userToDelete.username || userToDelete.full_name}`}
          subtitle="Esta acción no se puede deshacer"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmDelete} className="space-y-4">
            {deleteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              La cuenta dejará de existir y no podrá volver a ingresar. Sus ventas y movimientos de caja se conservan, pero
              ya no mostrarán su nombre como cajero. Si solo quieres impedir que ingrese, usa <b>Desactivar</b>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña de administrador
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161720] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5b63f6]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#1f2128]">
              <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" isLoading={isDeleting}>
                Eliminar Usuario
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