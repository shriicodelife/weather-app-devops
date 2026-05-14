const MAIN_MODULE = "../js/main";

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

function createElement() {
  return {
    innerHTML: "",
    src: "",
  };
}

function createMockDocument() {
  const elementsById = {
    "city-name": createElement(),
    metric: createElement(),
    humidity: createElement(),
    "feels-like": createElement(),
    "temp-min-today": createElement(),
    "temp-max-today": createElement(),
    "future-forecast-box": createElement(),
  };

  const weatherMainElements = [createElement(), createElement()];
  const weatherIcon = createElement();
  const weatherIcons = createElement();

  return {
    elementsById,
    weatherMainElements,
    weatherIcon,
    weatherIcons,
    getElementById: jest.fn(id => elementsById[id]),
    querySelectorAll: jest.fn(selector => {
      if (selector === "#weather-main") {
        return weatherMainElements;
      }

      return [];
    }),
    querySelector: jest.fn(selector => {
      if (selector === ".weather-icon") {
        return weatherIcon;
      }

      if (selector === ".weather-icons") {
        return weatherIcons;
      }

      return null;
    }),
  };
}

function forecastItem(date, temp, description, main) {
  return {
    dt_txt: `${date} 09:00:00`,
    main: {
      temp,
      humidity: 72,
      feels_like: temp - 1,
      temp_min: temp - 3,
      temp_max: temp + 4,
    },
    weather: [{ description, main }],
  };
}

function createForecastData(cityName = "Mumbai", firstCondition = "Clear") {
  return {
    city: { name: cityName },
    list: [
      forecastItem("2026-05-14", 31.8, `${firstCondition.toLowerCase()} weather`, firstCondition),
      forecastItem("2026-05-15", 22.4, "rain showers", "Rain"),
      forecastItem("2026-05-16", 15.9, "snow fall", "Snow"),
      forecastItem("2026-05-17", 26.1, "cloudy", "Clouds"),
      forecastItem("2026-05-18", 24.7, "misty", "Mist"),
      forecastItem("2026-05-19", 28.3, "hazy", "Haze"),
      forecastItem("2026-05-20", 27.2, "stormy", "Thunderstorm"),
      forecastItem("2026-05-21", 30.5, "windy", "Wind"),
    ],
  };
}

function installBrowserMocks({ fetchMocks = [], geolocationImpl } = {}) {
  jest.resetModules();

  const document = createMockDocument();
  global.document = document;
  global.alert = jest.fn();
  global.fetch = jest.fn();
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
  };

  fetchMocks.forEach(mockResponse => {
    if (mockResponse instanceof Error) {
      global.fetch.mockRejectedValueOnce(mockResponse);
    } else {
      global.fetch.mockResolvedValueOnce(mockResponse);
    }
  });

  const getCurrentPosition = jest.fn(
    geolocationImpl ||
      (() => {
        throw new Error("geolocation implementation not provided");
      })
  );

  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition,
      },
    },
  });

  return { document, getCurrentPosition };
}

function mockJsonResponse(data) {
  return {
    json: jest.fn().mockResolvedValue(data),
  };
}

describe("main.js helper functions", () => {
  let main;

  beforeEach(() => {
    jest.resetModules();
    delete global.navigator;
    delete global.document;
    main = require(MAIN_MODULE);
  });

  test.each([
    ["rain", "img/rain.png"],
    ["Clear", "img/sun.png"],
    ["clear sky", "img/sun.png"],
    ["snow", "img/snow.png"],
    ["clouds", "img/cloud.png"],
    ["smoke", "img/cloud.png"],
    ["mist", "img/mist.png"],
    ["Fog", "img/mist.png"],
    ["haze", "img/haze.png"],
    ["Thunderstorm", "img/thunderstorm.png"],
    ["unknown", "img/sun.png"],
  ])("maps %s weather to %s", (condition, expectedIcon) => {
    expect(main.getWeatherIcon(condition)).toBe(expectedIcon);
  });

  test("keeps only the first forecast entry for each date", () => {
    const forecasts = main.buildDailyForecasts([
      forecastItem("2026-05-14", 28.9, "light rain", "Rain"),
      forecastItem("2026-05-14", 31.2, "clear sky", "Clear"),
      forecastItem("2026-05-15", 25.4, "cloudy", "Clouds"),
    ]);

    expect(Object.keys(forecasts)).toEqual(["2026-05-14", "2026-05-15"]);
    expect(forecasts["2026-05-14"]).toMatchObject({
      description: "light rain",
      weatherImg: "rain",
    });
    expect(forecasts["2026-05-14"].temperature).toContain("28");
    expect(forecasts["2026-05-15"]).toMatchObject({
      description: "cloudy",
      weatherImg: "clouds",
    });
  });
});

describe("main.js geolocation weather rendering", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.document;
    delete global.fetch;
    delete global.alert;
    delete global.navigator;
  });

  test("fetches weather from coordinates and renders current weather UI", async () => {
    const currentWeather = createForecastData("Mumbai", "Clear");
    const forecastWeather = createForecastData("Mumbai", "Rain");
    let successCallback;

    const { document, getCurrentPosition } = installBrowserMocks({
      fetchMocks: [
        mockJsonResponse([{ name: "Mumbai" }]),
        mockJsonResponse(currentWeather),
        mockJsonResponse(forecastWeather),
      ],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    await successCallback({
      coords: {
        latitude: 19.076,
        longitude: 72.8777,
      },
    });
    await flushPromises();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("reverse?lat=19.076&lon=72.8777")
    );
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining("q=Mumbai&"));
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("forecast?q=Mumbai")
    );

    expect(document.elementsById["city-name"].innerHTML).toBe("Mumbai");
    expect(document.elementsById.metric.innerHTML).toContain("31");
    expect(document.weatherMainElements[0].innerHTML).toBe("clear weather");
    expect(document.weatherMainElements[1].innerHTML).toBe("clear weather");
    expect(document.elementsById.humidity.innerHTML).toBe(72);
    expect(document.elementsById["feels-like"].innerHTML).toBe(30);
    expect(document.elementsById["temp-min-today"].innerHTML).toContain("28");
    expect(document.elementsById["temp-max-today"].innerHTML).toContain("35");
    expect(document.weatherIcon.src).toBe("img/sun.png");
    expect(document.weatherIcons.src).toBe("img/sun.png");
  });

  test("renders forecast cards for rain, snow, clouds, mist, haze, thunderstorm, and default icons", async () => {
    const currentWeather = createForecastData("Delhi", "Rain");
    const forecastWeather = createForecastData("Delhi", "Clear");
    let successCallback;

    const { document } = installBrowserMocks({
      fetchMocks: [
        mockJsonResponse([{ name: "Delhi" }]),
        mockJsonResponse(currentWeather),
        mockJsonResponse(forecastWeather),
      ],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);
    await successCallback({ coords: { latitude: 28.6, longitude: 77.2 } });
    await flushPromises();

    const forecastHtml = document.elementsById["future-forecast-box"].innerHTML;

    expect(document.weatherIcon.src).toBe("img/rain.png");
    expect(forecastHtml).toContain("img/rain.png");
    expect(forecastHtml).toContain("img/snow.png");
    expect(forecastHtml).toContain("img/cloud.png");
    expect(forecastHtml).toContain("img/mist.png");
    expect(forecastHtml).toContain("img/haze.png");
    expect(forecastHtml).toContain("img/thunderstorm.png");
    expect(forecastHtml).toContain("windy");
  });

  test("alerts the user when geolocation permission fails", () => {
    let errorCallback;

    installBrowserMocks({
      geolocationImpl: (_success, error) => {
        errorCallback = error;
      },
    });

    require(MAIN_MODULE);
    errorCallback();

    expect(alert).toHaveBeenCalledWith("Please turn on your location and refresh the page");
  });

  test("logs an error when the reverse geocode API fails", async () => {
    let successCallback;

    installBrowserMocks({
      fetchMocks: [new Error("network down")],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);
    await successCallback({ coords: { latitude: 1, longitude: 2 } });

    expect(console.error).toHaveBeenCalledWith("An error occurred:", expect.any(Error));
  });

  test("logs an error when reverse geocode returns no city for invalid coordinates", async () => {
    let successCallback;

    installBrowserMocks({
      fetchMocks: [mockJsonResponse([])],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);
    await successCallback({ coords: { latitude: 0, longitude: 0 } });

    expect(console.error).toHaveBeenCalledWith("An error occurred:", expect.any(TypeError));
  });

  test("logs an error when the five-day forecast request fails", async () => {
    const currentWeather = createForecastData("NoCity", "Clouds");
    let successCallback;

    installBrowserMocks({
      fetchMocks: [
        mockJsonResponse([{ name: "" }]),
        mockJsonResponse(currentWeather),
        new Error("invalid city name"),
      ],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);
    await successCallback({ coords: { latitude: 10, longitude: 10 } });
    await flushPromises();

    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining("q=&"));
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching forecast:",
      expect.any(Error)
    );
  });

  test("renders an empty forecast section when forecast API returns no list items", async () => {
    const currentWeather = createForecastData("EmptyForecastCity", "Clear");
    let successCallback;

    const { document } = installBrowserMocks({
      fetchMocks: [
        mockJsonResponse([{ name: "EmptyForecastCity" }]),
        mockJsonResponse(currentWeather),
        mockJsonResponse({ city: { name: "EmptyForecastCity" }, list: [] }),
      ],
      geolocationImpl: success => {
        successCallback = success;
      },
    });

    require(MAIN_MODULE);
    await successCallback({ coords: { latitude: 11, longitude: 12 } });
    await flushPromises();

    expect(document.getElementById).toHaveBeenCalledWith("future-forecast-box");
    expect(document.elementsById["future-forecast-box"].innerHTML).toBe("");
  });
});
