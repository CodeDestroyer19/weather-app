import React, { useState, useEffect } from "react";
import {
  Box,
  Input,
  Button,
  Text,
  VStack,
  Spinner,
  Alert,
  Flex,
  HStack,
  Container,
  Separator,
  Badge,
  CloseButton,
  Switch,
  Field,
} from "@chakra-ui/react";
import axios from "axios";

const API_KEY = "e52ba994656643e7aae171114251405"; // Replace with your WeatherAPI.com API key

interface WeatherData {
  name: string;
  region: string;
  country: string;
  localtime: string;
  lat: number;
  lon: number;
  main: {
    temp: number;
    humidity: number;
    feelslike: number;
    wind: number;
    pressure: number;
    uv: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
}

interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    avgtemp_c: number;
    maxtemp_f: number;
    mintemp_f: number;
    avgtemp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    daily_chance_of_rain: number;
    maxwind_kph: number;
    avghumidity: number;
  };
}

interface WeatherAlert {
  headline: string;
  severity: string;
  urgency: string;
  areas: string;
  category: string;
  event: string;
  effective: string;
  expires: string;
  desc: string;
}

interface SearchHistoryItem {
  name: string;
  country: string;
  timestamp: number;
}

const Weather: React.FC = () => {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationError, setShowLocationError] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isFahrenheit, setIsFahrenheit] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const saved = localStorage.getItem("weatherSearchHistory");
      return saved ? JSON.parse(saved) : [];
    }
  );

  // Try to get user's location when component mounts
  useEffect(() => {
    getUserLocation();

    // Load temperature unit preference from localStorage
    const savedUnit = localStorage.getItem("weatherTempUnit");
    if (savedUnit) {
      setIsFahrenheit(savedUnit === "fahrenheit");
    }
  }, []);

  // Save search history to localStorage
  useEffect(() => {
    localStorage.setItem("weatherSearchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Save temperature unit preference to localStorage
  useEffect(() => {
    localStorage.setItem(
      "weatherTempUnit",
      isFahrenheit ? "fahrenheit" : "celsius"
    );
  }, [isFahrenheit]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsGettingLocation(false);
          setShowLocationError(true);
          setTimeout(() => setShowLocationError(false), 5000);
        }
      );
    } else {
      setShowLocationError(true);
      setTimeout(() => setShowLocationError(false), 5000);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setLoading(true);
    setError("");
    setWeather(null);
    setAlerts([]);
    try {
      // Get current weather
      const currentResponse = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${lat},${lon}&aqi=no`
      );

      // Get forecast with alerts
      const forecastResponse = await axios.get(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=3&aqi=no&alerts=yes`
      );

      transformAndSetWeatherData(currentResponse.data);
      setForecast(forecastResponse.data.forecast.forecastday);

      // Extract alerts if any
      if (forecastResponse.data.alerts && forecastResponse.data.alerts.alert) {
        setAlerts(forecastResponse.data.alerts.alert);
      }
    } catch (err) {
      setError("Error fetching weather data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    if (!city.trim()) return;

    setLoading(true);
    setError("");
    setWeather(null);
    setAlerts([]);
    try {
      // Get current weather
      const currentResponse = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}&aqi=no`
      );

      // Get forecast with alerts
      const forecastResponse = await axios.get(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=3&aqi=no&alerts=yes`
      );

      transformAndSetWeatherData(currentResponse.data);
      setForecast(forecastResponse.data.forecast.forecastday);

      // Extract alerts if any
      if (forecastResponse.data.alerts && forecastResponse.data.alerts.alert) {
        setAlerts(forecastResponse.data.alerts.alert);
      }

      // Add to search history
      const newLocation = {
        name: currentResponse.data.location.name,
        country: currentResponse.data.location.country,
        timestamp: Date.now(),
      };

      // Check if location already exists in history
      const exists = searchHistory.some(
        (item) =>
          item.name === newLocation.name && item.country === newLocation.country
      );

      if (!exists) {
        // Keep only the last 5 searches
        setSearchHistory((prev) => [newLocation, ...prev].slice(0, 5));
      }

      // Clear search input
      setCity("");
    } catch (err) {
      setError("City not found or API error.");
    } finally {
      setLoading(false);
    }
  };

  const transformAndSetWeatherData = (data: any) => {
    setWeather({
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
      localtime: data.location.localtime,
      lat: data.location.lat,
      lon: data.location.lon,
      main: {
        temp: data.current.temp_c,
        humidity: data.current.humidity,
        feelslike: data.current.feelslike_c,
        wind: data.current.wind_kph,
        pressure: data.current.pressure_mb,
        uv: data.current.uv,
      },
      weather: [
        {
          description: data.current.condition.text,
          icon: data.current.condition.icon,
        },
      ],
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchWeather();
    }
  };

  const handleHistoryItemClick = (location: string) => {
    setCity(location);
    fetchWeather();
  };

  const removeFromHistory = (index: number) => {
    setSearchHistory((prev) => prev.filter((_, i) => i !== index));
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const toggleAlertDetails = (index: number) => {
    setShowAlertDetails(showAlertDetails === index ? null : index);
  };

  const toggleTemperatureUnit = () => {
    setIsFahrenheit(!isFahrenheit);
  };

  // Convert Celsius to Fahrenheit
  const celsiusToFahrenheit = (celsius: number): number => {
    return (celsius * 9) / 5 + 32;
  };

  // Format date to display day name
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for search history
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format alert time
  const formatAlertTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  // Get alert severity color
  const getAlertColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "extreme":
        return "red.500";
      case "severe":
        return "orange.500";
      case "moderate":
        return "yellow.500";
      case "minor":
        return "blue.300";
      default:
        return "gray.500";
    }
  };

  // Get appropriate background gradient based on temperature
  const getBackgroundGradient = () => {
    if (!weather) return "linear(to-br, blue.400, blue.600)";

    const temp = weather.main.temp;
    if (temp > 30) return "linear(to-br, red.400, orange.500)"; // Hot
    if (temp > 20) return "linear(to-br, yellow.300, orange.400)"; // Warm
    if (temp > 10) return "linear(to-br, blue.300, teal.500)"; // Mild
    if (temp > 0) return "linear(to-br, blue.400, blue.600)"; // Cool
    return "linear(to-br, blue.600, purple.600)"; // Cold
  };

  // Simple tab system without using Chakra UI Tabs component
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Current Weather
        return (
          <Box>
            {/* Weather Alerts */}
            {alerts.length > 0 && (
              <Box mb={6}>
                <Text fontSize="lg" fontWeight="bold" mb={2}>
                  ⚠️ Weather Alerts ({alerts.length})
                </Text>
                <VStack gap={2} align="stretch">
                  {alerts.map((alert, index) => (
                    <Box
                      key={index}
                      bg={`${getAlertColor(alert.severity)}30`}
                      borderLeft={`4px solid ${getAlertColor(alert.severity)}`}
                      borderRadius="md"
                      p={3}
                      cursor="pointer"
                      onClick={() => toggleAlertDetails(index)}
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold">{alert.event}</Text>
                        <Badge
                          colorScheme={
                            alert.severity === "Extreme"
                              ? "red"
                              : alert.severity === "Severe"
                              ? "orange"
                              : alert.severity === "Moderate"
                              ? "yellow"
                              : "blue"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </Flex>

                      {showAlertDetails === index && (
                        <Box mt={2} fontSize="sm">
                          <Text>{alert.headline}</Text>
                          <Separator my={2} />
                          <Text fontStyle="italic">{alert.desc}</Text>
                          <Flex
                            justify="space-between"
                            mt={2}
                            fontSize="xs"
                            opacity={0.8}
                          >
                            <Text>
                              From: {formatAlertTime(alert.effective)}
                            </Text>
                            <Text>Until: {formatAlertTime(alert.expires)}</Text>
                          </Flex>
                        </Box>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Current Weather */}
            <Flex
              direction={{ base: "column", md: "row" }}
              align="center"
              justify="center"
              gap={6}
              mb={8}
            >
              <Box>
                <img
                  src={weather?.weather[0].icon}
                  alt={weather?.weather[0].description}
                  width="128"
                  height="128"
                />
                <Text fontSize="xl" fontWeight="medium" mt={2}>
                  {weather?.weather[0].description}
                </Text>
              </Box>
              <Box>
                <Text fontSize="6xl" fontWeight="bold" lineHeight="1">
                  {isFahrenheit
                    ? `${Math.round(
                        celsiusToFahrenheit(weather?.main.temp || 0)
                      )}°F`
                    : `${Math.round(weather?.main.temp || 0)}°C`}
                </Text>
                <Text fontSize="md">
                  Feels like{" "}
                  {isFahrenheit
                    ? `${Math.round(
                        celsiusToFahrenheit(weather?.main.feelslike || 0)
                      )}°F`
                    : `${Math.round(weather?.main.feelslike || 0)}°C`}
                </Text>
              </Box>
            </Flex>

            {/* Weather Details */}
            <Flex
              wrap="wrap"
              justify="center"
              gap={6}
              bg="whiteAlpha.200"
              p={4}
              borderRadius="lg"
            >
              <Box textAlign="center" minW="100px">
                <Text fontSize="sm" opacity={0.8}>
                  Humidity
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {weather?.main.humidity}%
                </Text>
              </Box>
              <Box textAlign="center" minW="100px">
                <Text fontSize="sm" opacity={0.8}>
                  Wind
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {weather?.main.wind} km/h
                </Text>
              </Box>
              <Box textAlign="center" minW="100px">
                <Text fontSize="sm" opacity={0.8}>
                  Pressure
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {weather?.main.pressure} mb
                </Text>
              </Box>
              <Box textAlign="center" minW="100px">
                <Text fontSize="sm" opacity={0.8}>
                  UV Index
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {weather?.main.uv}
                </Text>
              </Box>
            </Flex>
          </Box>
        );
      case 1: // Forecast
        return (
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={4}
            justify="center"
          >
            {forecast.map((day, index) => (
              <Box
                key={day.date}
                bg="whiteAlpha.200"
                p={4}
                borderRadius="lg"
                flex="1"
                textAlign="center"
              >
                <Text fontWeight="bold" mb={2}>
                  {index === 0 ? "Today" : formatDate(day.date)}
                </Text>
                <img
                  src={day.day.condition.icon}
                  alt={day.day.condition.text}
                  style={{ margin: "0 auto", width: "64px", height: "64px" }}
                />
                <Text fontSize="sm" mb={2}>
                  {day.day.condition.text}
                </Text>
                <Flex justify="center" gap={2} mb={2}>
                  <Text fontWeight="bold">
                    {isFahrenheit
                      ? `${Math.round(day.day.maxtemp_f)}°`
                      : `${Math.round(day.day.maxtemp_c)}°`}
                  </Text>
                  <Text opacity={0.7}>
                    {isFahrenheit
                      ? `${Math.round(day.day.mintemp_f)}°`
                      : `${Math.round(day.day.mintemp_c)}°`}
                  </Text>
                </Flex>
                <Separator my={2} opacity={0.2} />
                <Flex direction="column" gap={1} fontSize="xs">
                  <Flex justify="space-between">
                    <Text>Rain:</Text>
                    <Text>{day.day.daily_chance_of_rain}%</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>Humidity:</Text>
                    <Text>{day.day.avghumidity}%</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>Wind:</Text>
                    <Text>{day.day.maxwind_kph} km/h</Text>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        );
      case 2: // Map
        return (
          <Box>
            <Box
              borderRadius="lg"
              overflow="hidden"
              height="400px"
              position="relative"
            >
              <iframe
                title="Weather Map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.windy.com/embed2.html?rain,${weather?.lat},${weather?.lon},8,m:eZ8acJA`}
              />
            </Box>
            <Text fontSize="xs" mt={2} opacity={0.7} textAlign="right">
              Powered by Windy.com
            </Text>
          </Box>
        );
      case 3: // Alerts
        return alerts.length > 0 ? (
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              Weather Alerts
            </Text>
            <VStack gap={4} align="stretch">
              {alerts.map((alert, index) => (
                <Box
                  key={index}
                  bg={`${getAlertColor(alert.severity)}30`}
                  borderLeft={`4px solid ${getAlertColor(alert.severity)}`}
                  borderRadius="md"
                  p={4}
                >
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold" fontSize="lg">
                      {alert.event}
                    </Text>
                    <Badge
                      colorScheme={
                        alert.severity === "Extreme"
                          ? "red"
                          : alert.severity === "Severe"
                          ? "orange"
                          : alert.severity === "Moderate"
                          ? "yellow"
                          : "blue"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </Flex>

                  <Text fontWeight="medium" mb={2}>
                    {alert.headline}
                  </Text>
                  <Separator my={2} />
                  <Text>{alert.desc}</Text>

                  <Box mt={3} fontSize="sm">
                    <Text>
                      <strong>Areas:</strong> {alert.areas}
                    </Text>
                    <Text>
                      <strong>Category:</strong> {alert.category}
                    </Text>
                    <Flex
                      justify="space-between"
                      mt={2}
                      fontSize="xs"
                      opacity={0.8}
                    >
                      <Text>From: {formatAlertTime(alert.effective)}</Text>
                      <Text>Until: {formatAlertTime(alert.expires)}</Text>
                    </Flex>
                  </Box>
                </Box>
              ))}
            </VStack>
          </Box>
        ) : (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg">No weather alerts for this location</Text>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Box
        mx="auto"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="xl"
        bgGradient={getBackgroundGradient()}
        color="white"
      >
        <Box px={6} py={8}>
          <VStack gap={6}>
            {/* Search Bar */}
            <Flex w="full" direction={{ base: "column", md: "row" }} gap={4}>
              <Box position="relative" flex={1}>
                <Input
                  size="lg"
                  placeholder="Enter city name"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyPress={handleKeyPress}
                  bg="whiteAlpha.300"
                  border="none"
                  _placeholder={{ color: "whiteAlpha.700" }}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ bg: "whiteAlpha.500", boxShadow: "none" }}
                  width="100%"
                />
                {isGettingLocation && (
                  <Box
                    position="absolute"
                    right={4}
                    top="50%"
                    transform="translateY(-50%)"
                  >
                    <Spinner size="sm" />
                  </Box>
                )}
              </Box>
              <HStack>
                <Button
                  colorScheme="whiteAlpha"
                  size="lg"
                  onClick={fetchWeather}
                  disabled={!city.trim() || loading}
                  _hover={{ bg: "whiteAlpha.500" }}
                >
                  Search
                </Button>
                <Button
                  colorScheme="whiteAlpha"
                  size="lg"
                  onClick={getUserLocation}
                  disabled={loading || isGettingLocation}
                  _hover={{ bg: "whiteAlpha.500" }}
                >
                  📍 My Location
                </Button>
              </HStack>
            </Flex>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <Box w="full">
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Recent Searches
                  </Text>
                  <Button
                    size="xs"
                    colorScheme="whiteAlpha"
                    onClick={clearHistory}
                    variant="ghost"
                  >
                    Clear All
                  </Button>
                </Flex>
                <Flex gap={2} flexWrap="wrap">
                  {searchHistory.map((item, index) => (
                    <Badge
                      key={index}
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg="whiteAlpha.300"
                      position="relative"
                      pr={6}
                    >
                      <Box
                        as="span"
                        cursor="pointer"
                        onClick={() =>
                          handleHistoryItemClick(
                            `${item.name}, ${item.country}`
                          )
                        }
                        title={formatTime(item.timestamp)}
                      >
                        {item.name}, {item.country}
                      </Box>
                      <CloseButton
                        size="sm"
                        position="absolute"
                        right={0}
                        top={0}
                        onClick={() => removeFromHistory(index)}
                      />
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Location Error Alert */}
            {showLocationError && (
              <Alert.Root status="info" variant="solid" w="full">
                <Alert.Indicator />
                <Alert.Title>Please enter a city name manually.</Alert.Title>
              </Alert.Root>
            )}

            {/* Loading Spinner */}
            {loading && (
              <Flex justify="center" py={10}>
                <Spinner size="xl" />
              </Flex>
            )}

            {/* Error Alert */}
            {error && (
              <Alert.Root status="error" variant="solid" w="full">
                <Alert.Indicator />
                <Alert.Title>{error}</Alert.Title>
              </Alert.Root>
            )}

            {/* Weather Display */}
            {weather && (
              <Box w="full" textAlign="center">
                {/* Location and Time */}
                <Text fontSize="xl" fontWeight="medium" mb={1}>
                  {weather.name}
                  {weather.region ? `, ${weather.region}` : ""} •{" "}
                  {weather.country}
                </Text>
                <Text fontSize="sm" opacity={0.8} mb={2}>
                  {new Date(weather.localtime).toLocaleString()}
                </Text>

                {/* Temperature Unit Toggle */}
                <Field.Root
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  mb={4}
                >
                  <Field.Label htmlFor="temp-unit" mb="0" fontSize="sm" mr={2}>
                    °C
                  </Field.Label>
                  <Switch.Root
                    id="temp-unit"
                    checked={isFahrenheit}
                    onCheckedChange={toggleTemperatureUnit}
                    colorPalette="orange"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                  <Field.Label htmlFor="temp-unit" mb="0" ml={2} fontSize="sm">
                    °F
                  </Field.Label>
                </Field.Root>

                {/* Custom Tab Navigation */}
                <Flex
                  justify="center"
                  mb={6}
                  borderRadius="full"
                  bg="whiteAlpha.200"
                  p={1}
                  width="fit-content"
                  mx="auto"
                >
                  <Button
                    variant={activeTab === 0 ? "solid" : "ghost"}
                    colorPalette="whiteAlpha"
                    onClick={() => setActiveTab(0)}
                    borderRadius="full"
                    size="sm"
                    mx={1}
                  >
                    Current
                  </Button>
                  <Button
                    variant={activeTab === 1 ? "solid" : "ghost"}
                    colorPalette="whiteAlpha"
                    onClick={() => setActiveTab(1)}
                    borderRadius="full"
                    size="sm"
                    mx={1}
                  >
                    Forecast
                  </Button>
                  <Button
                    variant={activeTab === 2 ? "solid" : "ghost"}
                    colorPalette="whiteAlpha"
                    onClick={() => setActiveTab(2)}
                    borderRadius="full"
                    size="sm"
                    mx={1}
                  >
                    Map
                  </Button>
                  {alerts.length > 0 && (
                    <Button
                      variant={activeTab === 3 ? "solid" : "ghost"}
                      colorPalette="whiteAlpha"
                      onClick={() => setActiveTab(3)}
                      borderRadius="full"
                      size="sm"
                      mx={1}
                    >
                      Alerts
                      <Box
                        as="span"
                        bg="red.500"
                        borderRadius="full"
                        w="18px"
                        h="18px"
                        fontSize="xs"
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        fontWeight="bold"
                        ml={2}
                      >
                        {alerts.length}
                      </Box>
                    </Button>
                  )}
                </Flex>

                {/* Tab Content */}
                <Box mt={4}>{renderTabContent()}</Box>
              </Box>
            )}
          </VStack>
        </Box>
      </Box>
    </Container>
  );
};

export default Weather;
