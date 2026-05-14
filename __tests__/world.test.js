const { getFormattedDate, getWeatherIcon } = require("../js/world");

function createElement(tagName = "div") {
  return {
    tagName,
    className: "",
    innerHTML: "",
    src: "",
    value: "Berlin",
    style: {
      display: "",
      top: "-60rem",
    },
    children: [],
    addEventListener: jest.fn(),
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      return child;
    },
  };
}

function createWorldDocument({ includeBox = true } = {}) {
  const elements = {
    ".searchinput": createElement("input"),
    ".box": includeBox ? createElement() : null,
    ".normal-message": createElement(),
    ".error-message": createElement(),
    ".added-message": createElement(),
    ".date": createElement(),
    ".city-box": createElement(),
    ".add-section": createElement(),
    ".button": createElement("button"),
    ".btn-icon": createElement("i"),
  };

  return {
    elements,
    created: [],
    querySelector: jest.fn(selector => elements[selector]),
    createElement: jest.fn(tagName => {
      const element = createElement(tagName);
      this.created?.push(element);
      return element;
    }),
  };
}

function installWorldMocks({ includeBox = true, responses = [] } = {}) {
  jest.resetModules();

  const document = createWorldDocument({ includeBox });
  document.createElement = jest.fn(tagName => {
    const element = createElement(tagName);
    document.created.push(element);
    return element;
  });

  global.document = document;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.fetch = jest.fn();
  responses.forEach(response => {
    global.fetch.mockResolvedValueOnce(response);
  });

  return document;
}

function mockWeatherFetch({ ok = true, name = "Berlin", temp = 19.8, condition = "Clouds" } = {}) {
  return {
    ok,
    json: jest.fn().mockResolvedValue({
      name,
      main: { temp },
      weather: [{ main: condition }],
    }),
  };
}

function cleanupWorldMocks() {
  jest.clearAllMocks();
}

describe("world.js", () => {
  test("formats the current date for display", () => {
    expect(getFormattedDate(new Date("2026-05-14T00:00:00Z"))).toBe("May 14, 2026");
  });

  test.each([
    ["Rain", "img/rain.png"],
    ["Clear", "img/sun.png"],
    ["Clear Sky", "img/sun.png"],
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

  test("sets the date element and loads default cities on startup", () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch({ name: "London" }),
        mockWeatherFetch({ name: "Paris" }),
        mockWeatherFetch({ name: "New York" }),
        mockWeatherFetch({ name: "Mumbai" }),
        mockWeatherFetch({ name: "Tokyo" }),
      ],
    });

    require("../js/world");

    expect(document.elements[".date"].innerHTML).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("q=London"));
    expect(fetch).toHaveBeenNthCalledWith(5, expect.stringContaining("q=Tokyo"));

    cleanupWorldMocks();
  });

  test("creates a weather card for a valid city", async () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch({ name: "London" }),
        mockWeatherFetch({ name: "Paris" }),
        mockWeatherFetch({ name: "New York" }),
        mockWeatherFetch({ name: "Mumbai" }),
        mockWeatherFetch({ name: "Tokyo" }),
        mockWeatherFetch({ name: "Berlin", temp: 21.9, condition: "Clear" }),
      ],
    });
    const { city } = require("../js/world");

    const weatherBox = await city("Berlin");

    expect(weatherBox.className).toBe("weather-box");
    expect(weatherBox.children[0].children[0].innerHTML).toBe("Berlin");
    expect(weatherBox.children[0].children[1].innerHTML).toContain("21");
    expect(weatherBox.children[1].children[0].src).toBe("img/sun.png");
    expect(document.elements[".box"].children).toContain(weatherBox);

    cleanupWorldMocks();
  });

  test("creates the missing box container before rendering a city", async () => {
    const document = installWorldMocks({
      includeBox: false,
      responses: [
        mockWeatherFetch({ name: "London" }),
        mockWeatherFetch({ name: "Paris" }),
        mockWeatherFetch({ name: "New York" }),
        mockWeatherFetch({ name: "Mumbai" }),
        mockWeatherFetch({ name: "Tokyo" }),
        mockWeatherFetch({ name: "Rome", condition: "Rain" }),
      ],
    });
    const { city } = require("../js/world");

    const weatherBox = await city("Rome");

    expect(document.elements[".city-box"].children[0].className).toBe("box");
    expect(document.elements[".city-box"].children[0].children).toContain(weatherBox);

    cleanupWorldMocks();
  });

  test("returns an empty string for an invalid city response", async () => {
    installWorldMocks({
      responses: [
        mockWeatherFetch({ name: "London" }),
        mockWeatherFetch({ name: "Paris" }),
        mockWeatherFetch({ name: "New York" }),
        mockWeatherFetch({ name: "Mumbai" }),
        mockWeatherFetch({ name: "Tokyo" }),
        mockWeatherFetch({ ok: false }),
      ],
    });
    const { city } = require("../js/world");

    await expect(city("InvalidCity")).resolves.toBe("");

    cleanupWorldMocks();
  });

  test("toggles the add section open and closed", () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
      ],
    });

    require("../js/world");

    const clickHandler = document.elements[".button"].addEventListener.mock.calls[0][1];
    clickHandler();
    expect(document.elements[".add-section"].style.top).toBe("100px");
    expect(document.elements[".btn-icon"].className).toBe("fa-solid fa-circle-xmark");

    clickHandler();
    expect(document.elements[".add-section"].style.top).toBe("-60rem");
    expect(document.elements[".btn-icon"].className).toBe("fa-solid fa-circle-plus");

    cleanupWorldMocks();
  });

  test("handles Enter key search success and prepends the new card", async () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch({ name: "Berlin", condition: "Snow" }),
      ],
    });

    require("../js/world");

    const keydownHandler = document.elements[".searchinput"].addEventListener.mock.calls[0][1];
    await keydownHandler({ keyCode: 13 });

    expect(document.elements[".normal-message"].style.display).toBe("none");
    expect(document.elements[".error-message"].style.display).toBe("none");
    expect(document.elements[".added-message"].style.display).toBe("block");
    expect(document.elements[".box"].children[0].className).toBe("weather-box");

    cleanupWorldMocks();
  });

  test("handles Enter key search failure and shows the error message", async () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch({ ok: false }),
      ],
    });

    require("../js/world");

    const keydownHandler = document.elements[".searchinput"].addEventListener.mock.calls[0][1];
    await keydownHandler({ which: 13 });

    expect(document.elements[".normal-message"].style.display).toBe("none");
    expect(document.elements[".error-message"].style.display).toBe("block");
    expect(document.elements[".added-message"].style.display).toBe("none");
    expect(document.elements[".box"].children[0]).toBe("");

    cleanupWorldMocks();
  });

  test("ignores non-Enter keys in the search box", async () => {
    const document = installWorldMocks({
      responses: [
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
        mockWeatherFetch(),
      ],
    });

    require("../js/world");
    fetch.mockClear();

    const keydownHandler = document.elements[".searchinput"].addEventListener.mock.calls[0][1];
    await keydownHandler({ keyCode: 65, which: 65 });

    expect(fetch).not.toHaveBeenCalled();

    cleanupWorldMocks();
  });
});
