let apiKey = "1e3e8f230b6064d27976e41163a82b77";
let searchinput = typeof document !== "undefined" ? document.querySelector(".searchinput") : null;
let box = typeof document !== "undefined" ? document.querySelector(".box") : null;
let normalMessage = typeof document !== "undefined" ? document.querySelector(".normal-message") : null;
let errorMessage = typeof document !== "undefined" ? document.querySelector(".error-message") : null;
let addedMessage = typeof document !== "undefined" ? document.querySelector(".added-message") : null;

// Function to get the date
let date = new Date().getDate();
let months_name = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
let months = new Date().getMonth();
let year = new Date().getFullYear();

function getFormattedDate(currentDate = new Date()) {
  return `${months_name[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
}

function getWeatherIcon(condition) {
  if (condition === "Rain") {
    return "img/rain.png";
  } else if (condition === "Clear" || condition === "Clear Sky") {
    return "img/sun.png";
  } else if (condition === "Snow") {
    return "img/snow.png";
  } else if (condition === "Clouds" || condition === "Smoke") {
    return "img/cloud.png";
  } else if (condition === "Mist" || condition === "Fog") {
    return "img/mist.png";
  } else if (condition === "Haze") {
    return "img/haze.png";
  } else if (condition === "Thunderstorm") {
    return "img/thunderstorm.png";
  }

  return "";
}

let FullDate = typeof document !== "undefined" ? document.querySelector(".date") : null;
if (FullDate) {
  FullDate.innerHTML = getFormattedDate();
}

// Weather info
async function city(cityName) {
  let url = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?units=metric&q=${cityName}&appid=${apiKey}`
  );
  if (url.ok) {
    let data = await url.json();
    console.log(data);

    let cityBox = document.querySelector(".city-box");

    if (!box) {
      box = document.createElement("div");
      box.className = "box";
      cityBox.appendChild(box);
    }

    let weatherBox = document.createElement("div");
    weatherBox.className = "weather-box";

    let nameDiv = document.createElement("div");
    nameDiv.className = "name";

    let cityElement = document.createElement("div");
    cityElement.className = "city-name city";
    cityElement.innerHTML = data.name;

    let tempElement = document.createElement("div");
    tempElement.className = "weather-temp temp";
    tempElement.innerHTML = Math.floor(data.main.temp) + "°";

    let weatherIconDiv = document.createElement("div");
    weatherIconDiv.className = "weather-icon";

    let weatherImg = document.createElement("img");
    weatherImg.className = "weather";

    weatherImg.src = getWeatherIcon(data.weather[0].main);

    weatherIconDiv.appendChild(weatherImg);
    nameDiv.appendChild(cityElement);
    nameDiv.appendChild(tempElement);
    weatherBox.appendChild(nameDiv);
    weatherBox.appendChild(weatherIconDiv);
    box.appendChild(weatherBox);

    return weatherBox;

  } else {
    return "";
  }
}

// add section
let section = typeof document !== "undefined" ? document.querySelector(".add-section") : null;
let navBtn = typeof document !== "undefined" ? document.querySelector(".button") : null;
let navIcon = typeof document !== "undefined" ? document.querySelector(".btn-icon") : null;

if (navBtn) {
navBtn.addEventListener("click", () => {
  if (section.style.top === "-60rem") {
    section.style.top = "100px";
    navIcon.className = "fa-solid fa-circle-xmark";
  } else {
    section.style.top = "-60rem";
    navIcon.className = "fa-solid fa-circle-plus";
  }
});
}

if (searchinput) {
searchinput.addEventListener("keydown", async function (event) {
  if (event.keyCode === 13 || event.which === 13) {
    const weatherInfo = await city(searchinput.value);
    if (weatherInfo) {
      normalMessage.style.display = "none";
      errorMessage.style.display = "none";
      addedMessage.style.display = "block";
    } else {
      normalMessage.style.display = "none";
      errorMessage.style.display = "block";
      addedMessage.style.display = "none";
    }
    box.prepend(weatherInfo);
  }
});
}

if (typeof document !== "undefined") {
  city("London");
  city("Paris");
  city("New York");
  city("Mumbai");
  city("Tokyo");
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    city,
    getFormattedDate,
    getWeatherIcon,
  };
}
