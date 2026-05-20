'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, UserPlus, Check, X, Copy, Users, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useFriends,
  useFriendRequests,
  useFriendCode,
  useSendFriendRequest,
  useRespondToFriendRequest,
  useRemoveFriend,
  useSearchProfiles,
  useFindByFriendCode,
} from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'

type FriendsTab = 'friends' | 'requests' | 'add'

export default function FriendsPage() {
  const user = useAppStore((s) => s.user)
  const { data: friends, isLoading: friendsLoading } = useFriends()
  const { data: requests } = useFriendRequests()
  const { data: friendCode } = useFriendCode()
  const sendRequest = useSendFriendRequest()
  const respondToRequest = useRespondToFriendRequest()
  const removeFriendMutation = useRemoveFriend()
  const searchProfiles = useSearchProfiles()
  const findByCode = useFindByFriendCode()

  const [tab, setTab] = useState<FriendsTab>('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([])
  const [codeResult, setCodeResult] = useState<{ id: string; display_name: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setMessage(null)
    setCodeResult(null)
    const results = await searchProfiles.mutateAsync(searchQuery.trim())
    setSearchResults(results)
    if (results.length === 0) setMessage('No users found')
  }

  async function handleFindByCode() {
    if (!codeInput.trim()) return
    setMessage(null)
    setSearchResults([])
    const result = await findByCode.mutateAsync(codeInput.trim())
    if (result) {
      setCodeResult(result)
    } else {
      setMessage('No user found with that friend code')
    }
  }

  async function handleSendRequest(toUserId: string) {
    try {
      await sendRequest.mutateAsync(toUserId)
      setMessage('Friend request sent!')
      setSearchResults([])
      setCodeResult(null)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send request')
    }
  }

  async function handleRespond(requestId: string, status: 'accepted' | 'declined') {
    await respondToRequest.mutateAsync({ requestId, status })
  }

  async function handleRemoveFriend(requestId: string) {
    if (!confirm('Remove this friend?')) return
    await removeFriendMutation.mutateAsync(requestId)
  }

  function copyCode() {
    if (!friendCode) return
    navigator.clipboard.writeText(friendCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pendingCount = requests?.length ?? 0

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] pb-nav">
        <p className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          Sign in to manage your friends.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 px-4 py-8 max-w-[520px] mx-auto w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="text-[26px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
            Friends
          </h1>
          {friendCode && (
            <div className="flex items-center justify-center gap-2">
              <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                Your code: <span className="text-[var(--color-accent)] font-semibold font-mono">{friendCode}</span>
              </p>
              <button onClick={copyCode} className="p-1 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/40">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'friends'
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Users size={14} /> Friends
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 relative ${
              tab === 'requests'
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-cta)] text-white text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('add'); setMessage(null); setSearchResults([]); setCodeResult(null) }}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'add'
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <UserPlus size={14} /> Add
          </button>
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {friendsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends && friends.length > 0 ? (
              friends.map((f) => (
                <motion.div
                  key={f.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]"
                >
                  <div className="flex items-center gap-3">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent-deep)] to-[var(--color-accent)] flex items-center justify-center">
                        <span className="text-[12px] text-white font-bold">{f.display_name[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                      {f.display_name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(f.request_id)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-cta)] hover:bg-[var(--color-cta)]/10 transition-colors"
                    title="Remove friend"
                  >
                    <UserMinus size={14} />
                  </button>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-[13px] text-[var(--color-text-muted)] py-8" style={{ fontFamily: 'var(--font-body)' }}>
                No friends yet. Add friends by name or share your friend code!
              </p>
            )}
          </div>
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests && requests.length > 0 ? (
              requests.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]"
                >
                  <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {r.profile?.display_name ?? 'Unknown'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(r.id, 'accepted')}
                      className="p-1.5 rounded-lg bg-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30 transition-colors"
                      title="Accept"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleRespond(r.id, 'declined')}
                      className="p-1.5 rounded-lg bg-[var(--color-cta)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors"
                      title="Decline"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-[13px] text-[var(--color-text-muted)] py-8" style={{ fontFamily: 'var(--font-body)' }}>
                No pending friend requests.
              </p>
            )}
          </div>
        )}

        {/* Add friend */}
        {tab === 'add' && (
          <div className="space-y-4">
            {/* Search by name */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-3">
              <p className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                Search by Name
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-10 text-[13px] rounded-xl border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <Button
                  onClick={handleSearch}
                  disabled={searchProfiles.isPending || !searchQuery.trim()}
                  className="h-10 px-3 bg-[var(--color-accent-deep)] text-white"
                >
                  <Search size={16} />
                </Button>
              </div>
            </div>

            {/* Search by code */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-4 space-y-3">
              <p className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
                Add by Friend Code
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter friend code..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFindByCode()}
                  className="h-10 text-[13px] rounded-xl border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <Button
                  onClick={handleFindByCode}
                  disabled={findByCode.isPending || !codeInput.trim()}
                  className="h-10 px-3 bg-[var(--color-accent-deep)] text-white"
                >
                  <Search size={16} />
                </Button>
              </div>
            </div>

            {/* Message */}
            {message && (
              <p className={`text-center text-[13px] ${message.includes('sent') ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`} style={{ fontFamily: 'var(--font-body)' }}>
                {message}
              </p>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]"
                  >
                    <div className="flex items-center gap-3">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent-deep)] to-[var(--color-accent)] flex items-center justify-center">
                          <span className="text-[12px] text-white font-bold">{profile.display_name[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                        {profile.display_name}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleSendRequest(profile.id)}
                      disabled={sendRequest.isPending}
                      className="h-8 px-3 bg-[var(--color-accent-deep)] text-white text-[12px]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      <UserPlus size={14} className="mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Code search result */}
            {codeResult && (
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]">
                <span className="text-[13px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {codeResult.display_name}
                </span>
                <Button
                  onClick={() => handleSendRequest(codeResult.id)}
                  disabled={sendRequest.isPending}
                  className="h-8 px-3 bg-[var(--color-accent-deep)] text-white text-[12px]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <UserPlus size={14} className="mr-1" /> Add
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
