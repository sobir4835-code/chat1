const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function handle(res) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Xatolik yuz berdi');
  }
  return res.json();
}

export async function registerUser({ username, password, ism, familiya, yosh, shahar }) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, ism, familiya, yosh, shahar }),
  });
  return handle(res);
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handle(res);
}

export async function googleAuth(idToken) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  return handle(res);
}

export async function completeGoogleProfile({ idToken, username, ism, familiya, yosh, shahar }) {
  const res = await fetch(`${API_URL}/api/auth/google/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, username, ism, familiya, yosh, shahar }),
  });
  return handle(res);
}

export async function searchUsers(query, excludeId) {
  if (!query) return [];
  const params = new URLSearchParams({ q: query, excludeId: excludeId || '' });
  const res = await fetch(`${API_URL}/api/users/search?${params.toString()}`);
  return handle(res);
}

export async function getConversations(userId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/messages/conversations?${params.toString()}`);
  return handle(res);
}

export async function getMessages(userId, otherUserId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/messages/${otherUserId}?${params.toString()}`);
  return handle(res);
}

export async function updateProfile(userId, fields) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return handle(res);
}

export async function changePassword({ userId, oldPassword, newPassword }) {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, oldPassword, newPassword }),
  });
  return handle(res);
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: form });
  return handle(res);
}

export function fileUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export async function getTrendingGifs() {
  const res = await fetch(`${API_URL}/api/gifs/trending`);
  return handle(res);
}

export async function searchGifs(query) {
  if (!query) return [];
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${API_URL}/api/gifs/search?${params.toString()}`);
  return handle(res);
}

export async function getBlockStatus(otherId, userId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/users/${otherId}/block-status?${params.toString()}`);
  return handle(res);
}

export async function blockUser(otherId, userId) {
  const res = await fetch(`${API_URL}/api/users/${otherId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handle(res);
}

export async function unblockUser(otherId, userId) {
  const res = await fetch(`${API_URL}/api/users/${otherId}/unblock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handle(res);
}

export async function getGroups(userId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/groups?${params.toString()}`);
  return handle(res);
}

export async function createGroup({ name, creatorId, memberIds }) {
  const res = await fetch(`${API_URL}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, creatorId, memberIds }),
  });
  return handle(res);
}

export async function getGroupMembers(groupId, userId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members?${params.toString()}`);
  return handle(res);
}

export async function addGroupMember(groupId, userId, newMemberId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, newMemberId }),
  });
  return handle(res);
}

export async function leaveGroup(groupId, userId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handle(res);
}

export async function getGroupMessages(groupId, userId) {
  const params = new URLSearchParams({ userId });
  const res = await fetch(`${API_URL}/api/groups/${groupId}/messages?${params.toString()}`);
  return handle(res);
}

export async function getUser(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}`);
  return handle(res);
}

export async function getVapidPublicKey() {
  const res = await fetch(`${API_URL}/api/push/vapid-public-key`);
  return handle(res);
}

export async function subscribePush(userId, subscription) {
  const res = await fetch(`${API_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription }),
  });
  return handle(res);
}

export async function unsubscribePush(endpoint) {
  const res = await fetch(`${API_URL}/api/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  return handle(res);
}
