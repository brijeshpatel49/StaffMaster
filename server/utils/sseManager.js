const clients = new Map();

export const addClient = (userId, res) => {
  clients.set(userId.toString(), res);
};

export const removeClient = (userId) => {
  clients.delete(userId.toString());
};

export const sendToUser = (userId, data) => {
  const client = clients.get(userId.toString());
  if (client) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch { 
      removeClient(userId); 
    }
  }
};

export const sendToUsers = (userIds, data) => {
  userIds.forEach(id => sendToUser(id, data));
};
