const { buildWeatherUrl, getWeatherIcon } = require("../js/search");

function createElement(value = "") {
  return {
    value,
    innerHTML: "",
    src: "",
    style: {
      display: "",
    },
    addEventListener: jest.fn(),
  };
}

function createSearchDocument() {
  const elements = {
    ".searchinput": createElement("Delhi"),
    ".return": createElement(),
    ".message": createElement(),
    ".error-message": createElement(),
    ".weather-img": createElement(),
    ".city-name": createElement(),
    ".weather-temp": createElement(),
    ".wind": createElement(),
    ".pressure": createElement(),
    ".humidity": createElement(),
    ".sunrise": createElement(),
    ".sunset": createElement(),
  };

  return {
    elements,
    querySelector: jest.fn(selector => elements[selector]),
  };
}

function weatherResponse(overrides = {}) {
  return {
    name: "Delhi",
    main: {
      temp: 30.8,
      pressure: 1009.4,
      humidity: 58.7,
    },
    wind: {
      speed: 4.6,
    },
    sys: {
      sunrise: 1715644800,
      sunset: 1715691600,
    },
    weather: [{ main: "Rain" }],
    ...overrides,
  };
}

describe("search.js", () => {
  test.each([
    ["Rain", "img/rain.png"],
    ["Clear", "img/sun.png"],
    ["Snow", "img/snow.png"],
    ["Clouds", "img/cloud.png"],
    ["Smoke", "img/cloud.png"],
    ["Mist", "img/mist.png"],
    ["Fog", "img/mist.png"],
    ["Haze", "img/haze.png"],
    ["Thunderstorm", "img/thunderstorm.png"],
    ["Unknown", ""],
  ])("maps %s weather to %s", (condition, expectedIcon) => {
    expect(getWeatherIcon(condition)).toBe(expectedIcon);
  });

  test("builds the OpenWeatherMap URL from location parts", () => {
    const url = buildWeatherUrl("Mumbai", "MH", "IN");

    expect(url).toContain("https://api.openweathermap.org/data/2.5/weather");
    expect(url).toContain("units=metric");
    expect(url).toContain("q=Mumbai,MH,IN");
    expect(url).toContain("appid=");
  });

  test("renders weather details when the API returns a valid city", async () => {
    const document = createSearchDocument();
    global.document = document;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(weatherResponse()),
    });
    global.console = { log: jest.fn(), error: jest.fn() };

    const { search } = require("../js/search");

    await search("Delhi", "DL", "IN");

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("q=Delhi,DL,IN"));
    expect(document.elements[".return"].style.display).toBe("block");
    expect(document.elements[".message"].style.display).toBe("none");
    expect(document.elements[".error-message"].style.display).toBe("none");
    expect(document.elements[".city-name"].innerHTML).toBe("Delhi");
    expect(document.elements[".weather-temp"].innerHTML).toContain("30");
    expect(document.elements[".wind"].innerHTML).toBe("4 m/s");
    expect(document.elements[".pressure"].innerHTML).toBe("1009 hPa");
    expect(document.elements[".humidity"].innerHTML).toBe("58%");
    expect(document.elements[".sunrise"].innerHTML).toBeTruthy();
    expect(document.elements[".sunset"].innerHTML).toBeTruthy();
    expect(document.elements[".weather-img"].src).toBe("img/rain.png");

    jest.clearAllMocks();
  });

  test("shows the error message when the API rejects an invalid city", async () => {
    const document = createSearchDocument();
    global.document = document;
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const { search } = require("../js/search");

    await search("InvalidCity");

    expect(document.elements[".return"].style.display).toBe("none");
    expect(document.elements[".message"].style.display).toBe("none");
    expect(document.elements[".error-message"].style.display).toBe("block");

    jest.clearAllMocks();
  });

  test("searches when Enter is pressed in the search input", () => {
    jest.resetModules();
    const document = createSearchDocument();
    global.document = document;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(weatherResponse({ name: "Delhi" })),
    });
    global.console = { log: jest.fn(), error: jest.fn() };

    require("../js/search");

    const keydownHandler = document.elements[".searchinput"].addEventListener.mock.calls[0][1];
    keydownHandler({ keyCode: 13 });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("q=Delhi,undefined,undefined"));
    expect(console.log).toHaveBeenCalledWith("worked");

    jest.clearAllMocks();
  });

  test("does not search when a non-Enter key is pressed", () => {
    jest.resetModules();
    const document = createSearchDocument();
    global.document = document;
    global.fetch = jest.fn();
    global.console = { log: jest.fn(), error: jest.fn() };

    require("../js/search");

    const keydownHandler = document.elements[".searchinput"].addEventListener.mock.calls[0][1];
    keydownHandler({ keyCode: 65, which: 65 });

    expect(fetch).not.toHaveBeenCalled();

    jest.clearAllMocks();
  });
});
