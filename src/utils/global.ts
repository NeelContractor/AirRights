export type GLOBAL_TYPE = {
    [isoCode: string]: {
        country: string,
        cities: string[]
    }
}

export const GLOBAL: GLOBAL_TYPE = {
    "AF": { "country": "Afghanistan", "cities": ["Kabul", "Herat", "Kandahar"] },
    "AL": { "country": "Albania", "cities": ["Tirana", "Durrës", "Vlorë"] },
    "DZ": { "country": "Algeria", "cities": ["Algiers", "Oran", "Constantine"] },
    "AD": { "country": "Andorra", "cities": ["Andorra la Vella", "Encamp", "La Massana"] },
    "AO": { "country": "Angola", "cities": ["Luanda", "Huambo", "Lobito"] },
    "AR": { "country": "Argentina", "cities": ["Buenos Aires", "Córdoba", "Rosario"] },
    "AM": { "country": "Armenia", "cities": ["Yerevan", "Gyumri", "Vanadzor"] },
    "AU": { "country": "Australia", "cities": ["Canberra", "Sydney", "Melbourne"] },
    "AT": { "country": "Austria", "cities": ["Vienna", "Salzburg", "Graz"] },
    "AZ": { "country": "Azerbaijan", "cities": ["Baku", "Ganja", "Sumqayit"] },
  
    "BD": { "country": "Bangladesh", "cities": ["Dhaka", "Chittagong", "Khulna"] },
    "BE": { "country": "Belgium", "cities": ["Brussels", "Antwerp", "Ghent"] },
    "BJ": { "country": "Benin", "cities": ["Porto-Novo", "Cotonou", "Parakou"] },
    "BT": { "country": "Bhutan", "cities": ["Thimphu", "Phuntsholing", "Punakha"] },
    "BO": { "country": "Bolivia", "cities": ["Sucre", "La Paz", "Santa Cruz"] },
    "BR": { "country": "Brazil", "cities": ["Brasília", "São Paulo", "Rio de Janeiro"] },
    "BG": { "country": "Bulgaria", "cities": ["Sofia", "Plovdiv", "Varna"] },
  
    "CA": { "country": "Canada", "cities": ["Ottawa", "Toronto", "Vancouver"] },
    "CL": { "country": "Chile", "cities": ["Santiago", "Valparaíso", "Concepción"] },
    "CN": { "country": "China", "cities": ["Beijing", "Shanghai", "Shenzhen"] },
    "CO": { "country": "Colombia", "cities": ["Bogotá", "Medellín", "Cali"] },
    "CR": { "country": "Costa Rica", "cities": ["San José", "Alajuela", "Cartago"] },
    "CU": { "country": "Cuba", "cities": ["Havana", "Santiago de Cuba", "Camagüey"] },
  
    "DK": { "country": "Denmark", "cities": ["Copenhagen", "Aarhus", "Odense"] },
    "DO": { "country": "Dominican Republic", "cities": ["Santo Domingo", "Santiago", "La Romana"] },
  
    "EC": { "country": "Ecuador", "cities": ["Quito", "Guayaquil", "Cuenca"] },
    "EG": { "country": "Egypt", "cities": ["Cairo", "Alexandria", "Giza"] },
    "ET": { "country": "Ethiopia", "cities": ["Addis Ababa", "Dire Dawa", "Mekelle"] },
  
    "FI": { "country": "Finland", "cities": ["Helsinki", "Espoo", "Tampere"] },
    "FR": { "country": "France", "cities": ["Paris", "Lyon", "Marseille"] },
  
    "DE": { "country": "Germany", "cities": ["Berlin", "Munich", "Frankfurt"] },
    "GH": { "country": "Ghana", "cities": ["Accra", "Kumasi", "Tamale"] },
    "GR": { "country": "Greece", "cities": ["Athens", "Thessaloniki", "Patras"] },
  
    "HK": { "country": "Hong Kong", "cities": ["Hong Kong", "Kowloon", "Tsuen Wan"] },
    "HU": { "country": "Hungary", "cities": ["Budapest", "Debrecen", "Szeged"] },
  
    "IN": { "country": "India", "cities": ["New Delhi", "Mumbai", "Bengaluru"] },
    "ID": { "country": "Indonesia", "cities": ["Jakarta", "Surabaya", "Bandung"] },
    "IR": { "country": "Iran", "cities": ["Tehran", "Isfahan", "Shiraz"] },
    "IQ": { "country": "Iraq", "cities": ["Baghdad", "Basra", "Erbil"] },
    "IE": { "country": "Ireland", "cities": ["Dublin", "Cork", "Galway"] },
    "IL": { "country": "Israel", "cities": ["Jerusalem", "Tel Aviv", "Haifa"] },
    "IT": { "country": "Italy", "cities": ["Rome", "Milan", "Naples"] },
  
    "JP": { "country": "Japan", "cities": ["Tokyo", "Osaka", "Kyoto"] },
  
    "KE": { "country": "Kenya", "cities": ["Nairobi", "Mombasa", "Kisumu"] },
    "KR": { "country": "South Korea", "cities": ["Seoul", "Busan", "Incheon"] },
    "KW": { "country": "Kuwait", "cities": ["Kuwait City", "Hawalli", "Salmiya"] },
  
    "MX": { "country": "Mexico", "cities": ["Mexico City", "Guadalajara", "Monterrey"] },
    "MY": { "country": "Malaysia", "cities": ["Kuala Lumpur", "George Town", "Johor Bahru"] },
  
    "NG": { "country": "Nigeria", "cities": ["Abuja", "Lagos", "Port Harcourt"] },
    "NL": { "country": "Netherlands", "cities": ["Amsterdam", "Rotterdam", "Utrecht"] },
    "NO": { "country": "Norway", "cities": ["Oslo", "Bergen", "Trondheim"] },
  
    "NP": { "country": "Nepal", "cities": ["Kathmandu", "Pokhara", "Lalitpur"] },
    "NZ": { "country": "New Zealand", "cities": ["Wellington", "Auckland", "Christchurch"] },
  
    "PK": { "country": "Pakistan", "cities": ["Islamabad", "Karachi", "Lahore"] },
    "PH": { "country": "Philippines", "cities": ["Manila", "Cebu", "Davao"] },
    "PL": { "country": "Poland", "cities": ["Warsaw", "Kraków", "Gdańsk"] },
    "PT": { "country": "Portugal", "cities": ["Lisbon", "Porto", "Braga"] },
  
    "QA": { "country": "Qatar", "cities": ["Doha", "Al Wakrah", "Al Rayyan"] },
  
    "RO": { "country": "Romania", "cities": ["Bucharest", "Cluj-Napoca", "Timișoara"] },
    "RU": { "country": "Russia", "cities": ["Moscow", "Saint Petersburg", "Kazan"] },
  
    "SA": { "country": "Saudi Arabia", "cities": ["Riyadh", "Jeddah", "Mecca"] },
    "SG": { "country": "Singapore", "cities": ["Singapore", "Jurong", "Tampines"] },
    "ZA": { "country": "South Africa", "cities": ["Pretoria", "Cape Town", "Johannesburg"] },
    "ES": { "country": "Spain", "cities": ["Madrid", "Barcelona", "Valencia"] },
    "SE": { "country": "Sweden", "cities": ["Stockholm", "Gothenburg", "Malmö"] },
    "CH": { "country": "Switzerland", "cities": ["Bern", "Zurich", "Geneva"] },
  
    "TH": { "country": "Thailand", "cities": ["Bangkok", "Chiang Mai", "Phuket"] },
    "TR": { "country": "Turkey", "cities": ["Ankara", "Istanbul", "Izmir"] },
  
    "UA": { "country": "Ukraine", "cities": ["Kyiv", "Lviv", "Odesa"] },
    "AE": { "country": "United Arab Emirates", "cities": ["Abu Dhabi", "Dubai", "Sharjah"] },
    "GB": { "country": "United Kingdom", "cities": ["London", "Manchester", "Birmingham"] },
    "US": { "country": "United States", "cities": ["Washington, D.C.", "New York", "San Francisco"] },
  
    "VN": { "country": "Vietnam", "cities": ["Hanoi", "Ho Chi Minh City", "Da Nang"] },
    "ZW": { "country": "Zimbabwe", "cities": ["Harare", "Bulawayo", "Mutare"] }
}  