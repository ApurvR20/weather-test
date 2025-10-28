import { useState, useEffect } from 'react'

function App() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchHistory, setSearchHistory] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    setSearchLoading(true)
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      )
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setSuggestions(data.results)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (err) {
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setSearchLoading(false)
    }
  }

  const fetchWeather = async (cityName) => {
    if (!cityName.trim()) return
    
    setLoading(true)
    setError('')
    setShowSuggestions(false)
    
    try {
      // First, get coordinates for the city
      const geocodingResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      )
      const geocodingData = await geocodingResponse.json()
      
      if (!geocodingData.results || geocodingData.results.length === 0) {
        throw new Error('City not found. Please check the spelling and try again.')
      }
      
      const { latitude, longitude, name, country } = geocodingData.results[0]
      
      // Then, get weather data (current + hourly for precipitation probability)
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability&timezone=auto`
      )
      const weatherData = await weatherResponse.json()
      
      if (weatherData.error) {
        throw new Error(weatherData.reason || 'Failed to fetch weather data')
      }
      
      setWeather({
        ...weatherData.current,
        location: { name, country, latitude, longitude },
        hourly: weatherData.hourly
      })
      
      
      // Add to search history
      setSearchHistory(prev => {
        const newHistory = [cityName, ...prev.filter(item => item !== cityName)].slice(0, 5)
        return newHistory
      })
    } catch (err) {
      setError(err.message)
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchWeather(city)
  }

  const handleCityChange = (e) => {
    const value = e.target.value
    setCity(value)
    fetchSuggestions(value)
  }

  const handleSuggestionClick = (suggestion) => {
    setCity(`${suggestion.name}, ${suggestion.country}`)
    setShowSuggestions(false)
    fetchWeather(`${suggestion.name}, ${suggestion.country}`)
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (city.length >= 2) {
        fetchSuggestions(city)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [city])

  const getWeatherIcon = (weatherCode) => {
    const icons = {
      0: '☀️', // Clear sky
      1: '🌤️', // Mainly clear
      2: '⛅', // Partly cloudy
      3: '☁️', // Overcast
      45: '🌫️', // Fog
      48: '🌫️', // Depositing rime fog
      51: '🌦️', // Light drizzle
      53: '🌦️', // Moderate drizzle
      55: '🌦️', // Dense drizzle
      61: '🌧️', // Slight rain
      63: '🌧️', // Moderate rain
      65: '🌧️', // Heavy rain
      71: '❄️', // Slight snow
      73: '❄️', // Moderate snow
      75: '❄️', // Heavy snow
      77: '❄️', // Snow grains
      80: '🌦️', // Slight rain showers
      81: '🌦️', // Moderate rain showers
      82: '🌦️', // Violent rain showers
      85: '🌨️', // Slight snow showers
      86: '🌨️', // Heavy snow showers
      95: '⛈️', // Thunderstorm
      96: '⛈️', // Thunderstorm with slight hail
      99: '⛈️', // Thunderstorm with heavy hail
    }
    return icons[weatherCode] || '🌤️'
  }

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return directions[Math.round(degrees / 22.5) % 16]
  }

  const getWeatherDescription = (weatherCode) => {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    }
    return descriptions[weatherCode] || 'Unknown'
  }

  const getBackgroundGradient = (weatherCode) => {
    if (weatherCode >= 95) return 'from-purple-600 via-purple-700 to-indigo-800' // Thunderstorm
    if (weatherCode >= 80) return 'from-blue-500 via-blue-600 to-blue-700' // Rain
    if (weatherCode >= 60) return 'from-gray-500 via-gray-600 to-gray-700' // Rain
    if (weatherCode >= 50) return 'from-slate-500 via-slate-600 to-slate-700' // Drizzle
    if (weatherCode >= 40) return 'from-gray-400 via-gray-500 to-gray-600' // Fog
    if (weatherCode >= 20) return 'from-blue-300 via-blue-400 to-blue-500' // Partly cloudy
    return 'from-yellow-400 via-orange-500 to-red-500' // Clear/sunny
  }

  const getBackgroundColorsByTemperature = (temperature) => {
    // Always use a consistent dark base
    return '#0f172a, #1e293b, #334155' // Consistent dark gradient
  }

  const getTemperatureAccentColor = (temperature) => {
    if (temperature >= 35) return 'rgba(255, 69, 0, 0.1)' // Very Hot - Subtle orange
    if (temperature >= 30) return 'rgba(255, 140, 0, 0.1)' // Hot - Subtle orange
    if (temperature >= 25) return 'rgba(255, 215, 0, 0.1)' // Warm - Subtle yellow
    if (temperature >= 20) return 'rgba(152, 251, 152, 0.1)' // Pleasant - Subtle green
    if (temperature >= 15) return 'rgba(135, 206, 235, 0.1)' // Cool - Subtle light blue
    if (temperature >= 10) return 'rgba(65, 105, 225, 0.1)' // Cold - Subtle blue
    if (temperature >= 5) return 'rgba(30, 144, 255, 0.1)' // Very Cold - Subtle blue
    if (temperature >= 0) return 'rgba(0, 191, 255, 0.1)' // Freezing - Subtle cyan
    return 'rgba(25, 25, 112, 0.1)' // Below Freezing - Subtle navy
  }

  const getBackgroundColors = (weatherCode) => {
    // Fallback to weather code if temperature is not available
    if (weatherCode >= 95) return '#8b5cf6, #7c3aed, #6d28d9' // Thunderstorm - Purple
    if (weatherCode >= 80) return '#0ea5e9, #0284c7, #0369a1' // Rain - Blue
    if (weatherCode >= 60) return '#64748b, #475569, #334155' // Rain - Gray
    if (weatherCode >= 50) return '#94a3b8, #64748b, #475569' // Drizzle - Medium Gray
    if (weatherCode >= 40) return '#cbd5e1, #94a3b8, #64748b' // Fog - Light Gray
    if (weatherCode >= 20) return '#60a5fa, #3b82f6, #2563eb' // Partly cloudy - Blue
    if (weatherCode >= 1) return '#fbbf24, #f59e0b, #d97706' // Clear/Sunny - Orange
    return '#fbbf24, #f59e0b, #d97706' // Default - Orange
  }

  const getTemperatureColor = (temp) => {
    if (temp >= 30) return 'text-red-400'
    if (temp >= 20) return 'text-orange-400'
    if (temp >= 10) return 'text-yellow-400'
    if (temp >= 0) return 'text-blue-400'
    return 'text-cyan-400'
  }

  const getNextHourPrecipitationProbability = (hourlyData) => {
    if (!hourlyData || !hourlyData.precipitation_probability || !hourlyData.time) {
      return null
    }
    
    const now = new Date()
    const currentHour = now.getHours()
    
    // Find the next hour's data
    for (let i = 0; i < hourlyData.time.length; i++) {
      const hourTime = new Date(hourlyData.time[i])
      if (hourTime.getHours() > currentHour) {
        return {
          probability: hourlyData.precipitation_probability[i],
          time: hourTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            hour12: true 
          })
        }
      }
    }
    
    // If no future hour found, return the first available data
    return {
      probability: hourlyData.precipitation_probability[0],
      time: new Date(hourlyData.time[0]).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      })
    }
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${getBackgroundColorsByTemperature(weather?.temperature_2m || 20)})`,
        position: 'relative',
        transition: 'background 1s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        opacity: 0.3
      }}></div>

      {/* Temperature-based accent overlay */}
      {weather && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${getTemperatureAccentColor(weather.temperature_2m)} 0%, transparent 70%)`,
          opacity: 0.6
        }}></div>
      )}

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        overflow: 'visible'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '800',
            color: 'white',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Weather <span style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #dc2626)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Now</span>
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: '400',
            letterSpacing: '0.025em'
          }}>Your outdoor adventure companion</p>
        </div>

        {/* Search Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'visible'
        }}>
          {/* Subtle inner glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
          }}></div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={city}
                    onChange={handleCityChange}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    placeholder="Search for any city worldwide..."
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      fontSize: '1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      borderRadius: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)'
                      if (suggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.target.style.boxShadow = 'none'
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    aria-label="City name input"
                  />
                  
                  {/* Search loading indicator */}
                  {searchLoading && (
                    <div style={{
                      position: 'absolute',
                      right: '3rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      zIndex: 9999,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                      marginBottom: '0.5rem',
                      width: '100%'
                    }}>
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            transition: 'background 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent'
                          }}
                        >
                          <span style={{ fontSize: '1.25rem' }}>📍</span>
                          <div>
                            <div style={{
                              color: 'white',
                              fontWeight: '500',
                              fontSize: '0.9rem'
                            }}>
                              {suggestion.name}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.8rem'
                            }}>
                              {suggestion.country}
                              {suggestion.admin1 && `, ${suggestion.admin1}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '1.25rem'
                }}>
                  🌍
                </div>
              </div>
              
            <button
              type="submit"
              disabled={loading}
                style={{
                  padding: '1.25rem 2rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '1rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.3)'
                }}
                onMouseDown={(e) => {
                  e.target.style.transform = 'translateY(0) scale(0.98)'
                }}
                onMouseUp={(e) => {
                  e.target.style.transform = 'translateY(-2px) scale(1)'
                }}
                aria-label={loading ? "Searching..." : "Search weather"}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔍</span>
                    <span>Search</span>
                  </div>
                )}
            </button>
          </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  margin: 0
                }}>Recent searches</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCity(item)
                        fetchWeather(item)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '0.875rem',
                        borderRadius: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                        e.target.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </form>

        {error && (
            <div style={{
              marginTop: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '1rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}
        </div>

        {/* Weather Display */}
        {weather && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '2.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            {/* Subtle inner glow */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
            }}></div>

            {/* Main Weather Info */}
            <div style={{
              textAlign: 'center',
              marginBottom: '3rem'
            }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                marginBottom: '0.5rem',
                letterSpacing: '-0.01em'
              }}>
                {weather.location.name}, {weather.location.country}
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.125rem',
                marginBottom: '2rem',
                fontWeight: '500'
              }}>
                {getWeatherDescription(weather.weather_code)}
              </p>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  fontSize: '6rem',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                {getWeatherIcon(weather.weather_code)}
              </div>
                <div>
                  <div style={{
                    fontSize: '5rem',
                    fontWeight: '800',
                    color: weather.temperature_2m >= 30 ? '#fbbf24' : 
                           weather.temperature_2m >= 20 ? '#60a5fa' : 
                           weather.temperature_2m >= 10 ? '#34d399' : '#60a5fa',
                    marginBottom: '0.5rem',
                    lineHeight: 1
                  }}>
                {Math.round(weather.temperature_2m)}°C
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '1.25rem',
                    fontWeight: '500'
                  }}>
                    Feels like {Math.round(weather.apparent_temperature)}°C
                  </div>
                </div>
              </div>
            </div>

            {/* Temperature Theme Indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: weather.temperature_2m >= 30 ? '#ff8c00' : 
                             weather.temperature_2m >= 20 ? '#ffd700' : 
                             weather.temperature_2m >= 10 ? '#87ceeb' : '#4169e1',
                  boxShadow: `0 0 10px ${weather.temperature_2m >= 30 ? 'rgba(255, 140, 0, 0.5)' : 
                             weather.temperature_2m >= 20 ? 'rgba(255, 215, 0, 0.5)' : 
                             weather.temperature_2m >= 10 ? 'rgba(135, 206, 235, 0.5)' : 'rgba(65, 105, 225, 0.5)'}`
                }}></div>
                <span style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {weather.temperature_2m >= 30 ? 'Hot Weather' : 
                   weather.temperature_2m >= 20 ? 'Warm Weather' : 
                   weather.temperature_2m >= 10 ? 'Cool Weather' : 'Cold Weather'}
                </span>
              </div>
            </div>

            {/* Weather Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.transform = 'translateY(-4px)'
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💧</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  {weather.relative_humidity_2m}%
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Humidity
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.transform = 'translateY(-4px)'
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌧️</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  {weather.precipitation}mm
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Precipitation
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.transform = 'translateY(-4px)'
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💨</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  {Math.round(weather.wind_speed_10m)} km/h
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Wind Speed
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.transform = 'translateY(-4px)'
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧭</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  {getWindDirection(weather.wind_direction_10m)}
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Wind Direction
                </div>
              </div>

              {/* Precipitation Probability Card */}
              {getNextHourPrecipitationProbability(weather.hourly) && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.target.style.transform = 'translateY(-4px)'
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌧️</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: 'white',
                    marginBottom: '0.5rem'
                  }}>
                    {getNextHourPrecipitationProbability(weather.hourly).probability}%
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem'
                  }}>
                    Rain Chance
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem',
                    fontWeight: '400'
                  }}>
                    Next hour ({getNextHourPrecipitationProbability(weather.hourly).time})
                  </div>
                </div>
              )}
            </div>

            {/* Outdoor Activity Suggestion */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem 2rem',
                borderRadius: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <span style={{ fontSize: '1.5rem' }}>🌲</span>
                <span style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}>
                  Perfect for outdoor adventures!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Welcome State */}
        {!weather && !loading && !error && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle inner glow */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
            }}></div>
            
            <div style={{
              fontSize: '6rem',
              marginBottom: '2rem',
              animation: 'float 3s ease-in-out infinite'
            }}>🌍</div>
            
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '-0.01em'
            }}>
              Ready for Adventure?
            </h3>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.125rem',
              marginBottom: '2rem',
              fontWeight: '400',
              maxWidth: '500px',
              margin: '0 auto 2rem auto'
            }}>
              Enter a city name above to get real-time weather information
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>🌤️</span>
                <span>Real-time data</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>🌍</span>
                <span>Global coverage</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>🏔️</span>
                <span>Outdoor focused</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
