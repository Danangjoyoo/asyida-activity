import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import './App.css';

function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available trips from the generated_html directory
    fetch('/api/trips')
      .then(response => response.json())
      .then(data => setTrips(data))
      .catch(error => console.error('Error fetching trips:', error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="trip-list">
      <h1>Asyida Trips</h1>
      {loading ? (
        <div className="loading">Loading trips...</div>
      ) : trips.length === 0 ? (
        <div className="loading">No trips found in src/generated_html</div>
      ) : (
        <div className="trips-grid">
          {trips.map(trip => (
            <div key={trip.slug} className="trip-card">
              <h3>{trip.title}</h3>
              <p>{trip.slug}</p>
              <Link to={`/trip/${trip.slug}`} className="trip-link">
                View Trip
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TripViewer() {
  const { slug } = useParams();
  const [tripData, setTripData] = useState(null);
  const [activeFile, setActiveFile] = useState('');

  useEffect(() => {
    // Fetch trip data
    fetch(`/api/trip/${slug}`)
      .then(response => response.json())
      .then(data => {
        setTripData(data);
        if (data.aiFiles.length > 0) {
          setActiveFile(data.aiFiles[0]);
        }
      })
      .catch(error => console.error('Error fetching trip data:', error));
  }, [slug]);

  if (!tripData) {
    return <div className="loading">Loading trip...</div>;
  }

  const files = tripData.aiFiles;

  return (
    <div className="trip-viewer">
      <div className="trip-header">
        <Link to="/" className="back-link">← Back to Trips</Link>
        <h1>{tripData.title}</h1>
      </div>
      
      <div className="trip-nav">
        {files.map(file => (
          <button
            key={file}
            className={`nav-button ${activeFile === file ? 'active' : ''}`}
            onClick={() => setActiveFile(file)}
          >
            <span>{file.replace('.html', '').toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="trip-content">
        <iframe
          src={`http://localhost:4000/generated_html/${slug}/${activeFile}`}
          className="trip-frame"
          title={activeFile}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/:slug" element={<TripViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
