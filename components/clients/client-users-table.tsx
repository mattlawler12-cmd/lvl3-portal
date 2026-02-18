'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import type { UserWithAccess } from '@/app/actions/clients'
import { revokeAccess } from '@/app/actions/clients'
import InviteUserModal from './invite-user-modal'

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-white text-black',
  member: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  client: 'bg-zinc-700 text-zinc-300',
}

interface ClientUsersTableProps {
  users: UserWithAccess[]
  clientId: string
  clientName: string
}

export default function ClientUsersTable({ users, clientId, clientName }: ClientUsersTableProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleRevoke(userId: string) {
    setRevoking(userId)
    try {
      await revokeAccess(userId, clientId)
      router.refresh()
    } catch (err) {
      console.error('Revoke failed:', err)
    } finally {
      setRevoking(null)
    }
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Users with access</h2>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-zinc-100 transition-colors"
          >
            <UserPlus size={13} />
            Add access
          </button>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No users yet. Invite a client or team member to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Email</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-5 py-3 text-zinc-200">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block text-xs font-medium rounded-full px-2.5 py-0.5 ${ROLE_BADGE[u.role] ?? ROLE_BADGE.client}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500">
                    {new Date(u.granted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(u.id)}
                      disabled={revoking === u.id}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {revoking === u.id ? 'Removing…' : 'Revoke'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inviteOpen && (
        <InviteUserModal
          clientId={clientId}
          clientName={clientName}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  )
}
