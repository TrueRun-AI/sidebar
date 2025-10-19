import React, { useEffect, useState } from 'react';
import './styles/Sidebar.css';

const Sidebar = () => {
  const [containers, setContainers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/logs', { credentials: 'include' })
      .then(response => {
        if (response.status === 401) throw new Error('Authentication required');
        return response.json();
      })
      .then(data => setContainers(data))
      .catch(error => setError(error.message));
  }, []);

  if (error) return <div className="error">Error: {error}. Please log in.</div>;

  return (
    <div className="sidebar">
      <h2>TrueRun.AI - Containers</h2>
      {containers.map((container, index) => (
        <div key={index} className="card">
          <p><strong>Container:</strong> {container.container_number}</p>
          <p><strong>Status:</strong> <span className={container.release_status === 'Released' ? 'released' : 'not-released'}>{container.release_status}</span></p>
          {/* Add more fields */}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;