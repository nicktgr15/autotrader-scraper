const Nightmare = require('nightmare')
const nightmare = Nightmare({ useragent: 'AutoTraderScraper', pollInterval: 20, width: 1400 })
const cheerio = require('cheerio')
const fetch = require('node-fetch')

class AutoTraderScraper {
  constructor() {

  }

  async search(criteria) {
    const url = this._buildSearchURL(criteria)
    const listings = await this.fetchListings(url)
    return listings
  }

  _buildSearchURL(criteria) {
    const radius = criteria.radius ? new Criteria('radius', criteria.radius) : null
    const postcode = criteria.postcode ? new Criteria('postcode', criteria.postcode) : null
    const condition = criteria.condition ? new Criteria('condition', criteria.condition) : null
    const minPrice = criteria.price.min ? new Criteria('minPrice', criteria.price.min) : null
    const maxPrice = criteria.price.max ? new Criteria('maxPrice', criteria.price.max) : null
    const make = criteria.make ? new Criteria('make', criteria.make) : null
    const model = criteria.model ? new Criteria('model', criteria.model) : null
    const variant = criteria.variant ? new Criteria('variant', criteria.variant) : null
    const minYear = criteria.year.min ? new Criteria('minYear', criteria.year.min): null
    const maxYear = criteria.year.max ? new Criteria('maxYear', criteria.year.max): null
    const minMileage = criteria.mileage.min ? new Criteria('minMileage', criteria.mileage.min) : null
    const maxMileage = criteria.mileage.max ? new Criteria('maxMileage', criteria.mileage.max) : null
    const body = criteria.body ? new Criteria('body', criteria.body) : null
    const fuelType = criteria.fuel.type ? new Criteria('fuelType', criteria.fuel.type) : null
    const fuelConsumption = criteria.fuel.consumption ? new Criteria('fuelConsumption', criteria.fuel.consumption) : null
    const minEngineSize = criteria.engine.min ? new Criteria('minEngineSize', criteria.engine.min) : null
    const maxEngineSize = criteria.engine.max ? new Criteria('maxEngineSize', criteria.engine.max) : null
    const acceleration = criteria.acceleration ? new Criteria('acceleration', criteria.acceleration) : null
    const gearbox = criteria.gearbox ? new Criteria('gearbox', criteria.gearbox) : null
    const drivetrain = criteria.drivetrain ? new Criteria('drivetrain', criteria.drivetrain) : null
    const emissions = criteria.emissions ? new Criteria('emissions', criteria.emissions) : null
    const doors = criteria.doors ? new Criteria('doors', criteria.doors) : null
    const minSeats = criteria.seats.min ? new Criteria('minSeats', criteria.seats.min) : null
    const maxSeats = criteria.seats.max ? new Criteria('maxSeats', criteria.seats.max) : null
    const insurance = criteria.insurance ? new Criteria('insuranceGroup', criteria.insurance) : null
    const annualTax = criteria.tax ? new Criteria('annualTax', criteria.tax) : null
    const colour = criteria.colour ? new Criteria('colour', criteria.colour): null
    const excludeWriteOffs = criteria.excludeWriteOffs ? new Criteria('excludeWriteOffs', true) : null
    const onlyWriteOffs = criteria.onlyWriteOffs ? new Criteria('onlyWriteOffs', true) : null
    const customKeywords = criteria.customKeywords ? new Criteria('customKeywords', criteria.customKeywords) : null
    const page = criteria.pageNumber ? new Criteria('page', criteria.pageNumber) : null
    return [`https://www.autotrader.co.uk/car-search?${radius ? radius.parameter : ''}${postcode ? postcode.parameter : ''}${condition ? condition.parameter : ''}${make ? make.parameter : ''}${model ? model.parameter : ''}`,
      `${variant ? variant.parameter : ''}${minPrice ? minPrice.parameter : ''}${maxPrice ? maxPrice.parameter : ''}${minYear ? minYear.parameter : ''}${maxYear ? maxYear.parameter : ''}`,
      `${minMileage ? minMileage.parameter : ''}${maxMileage ? maxMileage.parameter : ''}${body ? body.parameter : ''}${fuelType ? fuelType.parameter : ''}${fuelConsumption ? fuelConsumption.parameter : ''}`,
      `${minEngineSize ? minEngineSize.parameter : ''}${maxEngineSize ? maxEngineSize.parameter : ''}${acceleration ? acceleration.parameter : ''}${gearbox ? gearbox.parameter : ''}`,
      `${drivetrain ? drivetrain.parameter : ''}${emissions ? emissions.parameter : ''}${doors ? doors.parameter : ''}${minSeats ? minSeats.parameter : ''}${maxSeats ? maxSeats.parameter : ''}`,
      `${insurance ? insurance.parameter : ''}${annualTax ? annualTax.parameter : ''}${colour ? colour.parameter : ''}${excludeWriteOffs ? excludeWriteOffs.parameter : ''}`,
      `${onlyWriteOffs ? onlyWriteOffs.parameter : ''}${customKeywords ? customKeywords.parameter : ''}${page ? page.parameter : ''}`].join('')
  }

  async fetchListings(url) {
    const content = await fetch(url)
      .then(res => res.text())
      .then((body) => {
        return body
      })
    if (!content) return false
    const $ = cheerio.load(content)
    const numOfListings = $('h1.search-form__count').text().replace(/,/g, '').match(/^[0-9]+/)[0]
    const listings = $('li.search-page__result').map((i, el) => {
      return new Listing(el).get()
    }).get()
    return listings
  }

  async fetchAdvert(url) {
    const condition = (/https:\/\/www.autotrader.co.uk\/classified\/advert\/new\/[0-9]+/.test(url)) ? 'New' : 'Used'
    if (condition === 'Used') {
      // TODO: Allow the user to specify data to ignore to speed up retrieval times by removing waits
      // TODO: Impliment a method of detecting whether certain information exists before waiting for it (i.e. seller information)
      const content = await nightmare
        .goto(url)
        .wait('div.fpa__wrapper')
        // .wait('#about-seller > p > button')
        .wait('div.review-links')
        .click('#app > main > article > div.fpa__wrapper.fpa__flex-container.fpa__content > article > div.fpa__overview > p > button')
        // .click('#about-seller > p > button')
        .evaluate(function() {
          return document.body.innerHTML
        }).end()
      const $ = cheerio.load(content)
      const advert = new Advert($('article.fpa').find('div.fpa__wrapper').html(), condition)
      return advert.get()
    } else {
      let content = await nightmare
      .goto(url)
      .wait('.non-fpa-stock-page')
      .wait('.dealer-details--full')
      .evaluate(function() {
        return document.body.innerHTML
      }).end()
      const $ = cheerio.load(content)
      const advert = new Advert($('div.non-fpa-stock-page').find('section.main-page').html(), condition)
      return advert.get()
    }
  }
}

class Criteria {
  constructor(type, value) {
      if (!type || !value) {
        console.error('Missing Parameter: Criteria object requires both type and value')
        return null
      }
      this.type = type
      this.value = value
  }
  get parameter() {
    switch (this.type) {
      case 'radius':
        return this.validate() ? `radius=${this.value}` : ''
        break
      case 'postcode':
        return `&postcode=${this.value.toLowerCase()}`
        break
      case 'condition':
        if (typeof this.value === 'object') return this.value.map((c) => { return `&onesearchad=${encodeURIComponent(c)}` }).join('')
        else `&onesearchad=${encodeURIComponent(this.value)}`
        break
      case 'minPrice':
        return this.validate() ? `&price-from=${this.value}` : ''
        break
      case 'maxPrice':
        return this.validate() ? `&price-to=${this.value}` : ''
        break
      case 'make':
        return `&make=${encodeURIComponent(this.value.toUpperCase())}`
        break
      case 'model':
        return `&model=${encodeURIComponent(this.value.toUpperCase())}`
        break
      case 'variant':
        return `&aggregatedTrim=${encodeURIComponent(this.value)}`
        break
      case 'minYear':
        return this.validate() ? `&year-from=${this.value}` : ''
        break
      case 'maxYear':
        return this.validate() ? `&year-to=${this.value}` : ''
        break
      case 'minMileage':
        return this.validate() ? `&minimum-mileage=${this.value}` : ''
        break
      case 'maxMileage':
        return this.validate() ? `&maximum-mileage=${this.value}` : ''
        break
      case 'body':
        return this.validate() ? `&body-type=${encodeURIComponent(this.value)}` : ''
        break
      case 'fuelType':
        return this.validate() ? `&fuel-type=${this.value}` : ''
        break
      case 'fuelConsumption':
        return this.validate() ? `&fuel-consumption=${this.value}` : ''
        break
      case 'minEngineSize':
        return this.validate() ? `&minimum-badge-engine-size=${this.value}` : ''
        break
      case 'maxEngineSize':
        return this.validate() ? `&maximum-badge-engine-size=${this.value}` : ''
        break
      case 'acceleration':
        return this.validate() ? `&zero-to-60=${this.value}` : ''
        break
      case 'gearbox':
        return this.validate() ? `&transmission=${this.value}` : ''
        break
      case 'drivetrain':
        return this.validate() ? `&drivetrain=${encodeURIComponent(this.value)}` : ''
        break
      case 'emissions':
        return this.validate() ? `&co2-emissions-cars=${this.value}` : ''
        break
      case 'doors':
        return this.validate() ? `&quantity-of-doors=${this.value}` : ''
        break
      case 'minSeats':
        return this.validate() ? `&minimum-seats=${this.value}` : ''
        break
      case 'maxSeats':
        return this.validate() ? `&maximum-seats=${this.value}` : ''
        break
      case 'insuranceGroup':
        return this.validate() ? `&insuranceGroup=${this.value}` : ''
        break
      case 'annualTax':
        return this.validate() ? `&annual-tax-cars=${this.value}` : ''
        break
      case 'colour':
        return this.validate() ? `&colour=${encodeURIComponent(this.value)}` : ''
        break
      case 'excludeWriteOffs':
        return `&exclude-writeoff-categories=on`
        break
      case 'onlyWriteOffs':
        return `&only-writeoff-categories=on`
        break
      case 'customKeywords':
        return `&keywords=${encodeURIComponent(this.value)}`
        break
      case 'page':
        return `&page=${this.value}`
        break
      default:
        return ''
        break
    }
  }
  validate() {
    switch (this.type) {
      case 'radius':
      case 'minPrice':
      case 'maxPrice':
      case 'minYear':
      case 'maxYear':
      case 'minMileage':
      case 'maxMileage':
      case 'page':
        return /[0-9]+/.test(this.value)
        break
      case 'body':
        const VALID_BODY_TYPES = ['Convertible', 'Coupe', 'Estate', 'Hatchback', 'MPV', 'Other', 'Pickup', 'SUV', 'Unlisted']
        return VALID_BODY_TYPES.includes(this.value)
        break
      case 'fuelType':
        const VALID_FUEL_TYPES = ['Bi Fuel', 'Diesel', ' Electric', 'Hybrid - Diesel/Electric', 'Hybrid - Diesel/Electric Plug-in', 'Hybrid - Petrol/Electric', 'Hybrid - Petrol/Electric Plug-in', 'Petrol', 'Petrol Ethanol', 'Unlisted']
        return VALID_FUEL_TYPES.includes(this.value)
        break
      case 'fuelConsumption':
        const VALID_FUEL_CONSUMPTIONS = ['OVER_30', 'OVER_40', 'OVER_50', 'OVER_60']
        return VALID_FUEL_CONSUMPTIONS.includes(this.value)
        break
      case 'minEngineSize':
      case 'maxEngineSize':
        const VALID_ENGINE_SIZES = ['0', '1.0', '1.2', '1.4', '1.6', '1.8', '1.9', '2.0', '2.2', '2.4', '2.6', '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0']
        return VALID_ENGINE_SIZES.includes(this.value)
        break
      case 'acceleration':
        const VALID_ACCELERATION = ['TO_5', 'TO_8', '8_TO_12', 'OVER_12']
        return VALID_ACCELERATION.includes(this.value)
        break
      case 'gearbox':
        const VALID_GEARBOX = ['Automatic', 'Manual']
        return VALID_GEARBOX.includes(this.value)
        break
      case 'drivetrain':
        const VALID_DRIVETRAIN = ['All Wheel Drive', 'Four Wheel Drive', 'Front Wheel Drive', 'Rear Wheel Drive']
        return VALID_DRIVETRAIN.includes(this.value)
        break
      case 'emissions':
        const VALID_EMISSIONS = ['TO_75', 'TO_100', 'TO_110', 'TO_120', 'TO_130', 'TO_140', 'TO_150', 'TO_165', 'TO_175', 'TO_185', 'TO_200', 'TO_225', 'TO_255', 'OVER_255']
        return VALID_EMISSIONS.includes(this.value)
        break
      case 'doors':
        const VALID_DOORS = ['0', '2', '3', '4', '5', '6']
        return VALID_DOORS.includes(this.value)
        break
      case 'minSeats':
      case 'maxSeats':
        const VALID_SEATS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
        return VALID_SEATS.includes(this.value)
        break
      case 'insuranceGroup':
        const VALID_INSURANCE_GROUPS = ['10U', '20U', '30U', '40U']
        return VALID_INSURANCE_GROUPS.includes(this.value)
        break
      case 'annualTax':
        const VALID_ANNUAL_TAX = ['EQ_0', 'TO_20', 'TO_30', 'TO_110', 'TO_130', 'TO_145', 'TO_185', 'TO_210', 'TO_230', 'TO_270', 'TO_295', 'TO_500', 'OVER_500']
        return VALID_ANNUAL_TAX.includes(this.value)
        break
      case 'colour':
        const VALID_COLOURS = ['Beige', 'Black', 'Blue', 'Bronze', 'Brown', 'Burgundy', 'Gold', 'Green', 'Grey', 'Indigo', 'Magenta', 'Maroon', 'Multicolour', 'Navy', 'Orange', 'Pink', 'Purple', 'Red', 'Silver', 'Turquoise', 'Unlisted', 'White', 'Yellow']
        return VALID_COLOURS.includes(this.value)
        break
    }
  }
}

class Advert {
  constructor(node, condition) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.condition = condition
    if (condition === 'Used') {
      this.title = this.$('.advert-heading__title').text()
      this.price = this.$('.advert-price__cash-price').text()
      this.description = this.$('.fpa__description').text()
      this.rating = {
        owner: this.$('section.stars__owner-rating--small').next('span.review-links__rating').text(),
        autotrader: this.$('section.stars__expert-rating--small').next('span.review-links__rating').text()
      }
      this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      // TODO: Add retrieval of the 'details' section of the ad
      this.seller = {
        name: this.$('.seller-name__link').first().text(),
        location: this.$('.seller-locations__town').text(),
        number: this.$('.seller-numbers').text(),
        rating: this.$('.review-links__rating').first().text(),
        description: this.$('#about-seller > p').text()
      }
    } else {
      this.title = this.$('div.detailsmm').find('.atc-type-phantom').text()
      this.price = this.$('div.detailsdeal').find('.atc-type-phantom').text()
      this.keySpecs = this.$('.key-specifications').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      this.standardFeatures = this.$('ul.detail--list').find('li').map((i, el) => {
        return this.$(el).text().replace(/\n/g, '').trim()
      }).get()
      // TODO: Add retrieval of the 'details' section of the ad
      this.review = {
        score: this.$('.review-holder').find('.starRating__number').text(),
        blurb: this.$('.review-holder').find('.atc-type-picanto').text(),
        pros: this.$('.review-holder').find('.pro-list').find('li').map((i, el) => {
          return this.$(el).text().replace(/\n/g, '').trim()
        }).get(),
        cons: this.$('.review-holder').find('.con-list').find('li').map((i, el) => {
          return this.$(el).text().replace(/\n/g, '').trim()
        }).get(),
      }
      this.seller = {
        name: this.$('.dealer-details--full').find('#dealer-name').text(),
        rating: this.$('.dealer-details--full').find('.dealer__overall-rating-score').text(),
        description: this.$('.dealer-details--full').find('.atc-type-picanto').text(),
      }
    }
  }

  get() {
    return this.condition === 'Used' ? {
      title: this.title,
      price: this.price,
      description: this.description,
      rating: this.rating,
      condition: this.condition,
      keySpecs: this.keySpecs,
      seller: this.seller
    } : {
      title: this.title,
      price: this.price,
      condition: this.condition,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      review: this.review,
      seller: this.seller
    }
  }

  json() {
    return this.used ? JSON.stringify({
      title: this.title,
      price: this.price,
      description: this.description,
      condition: this.condition,
      keySpecs: this.keySpecs,
      seller: this.seller
    }) : JSON.stringify({
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      standardFeatures: this.standardFeatures,
      review: this.review,
      seller: this.seller
    })
  }
}

class Listing {
  constructor(node) {
    if (!node) return null
    this.$ = cheerio.load(node)
    this.title = this.$('.listing-title').text()
    this.price = this.$('.vehicle-price').first().text()
    /* FIX: the following cannot be used as the data provided by users is unpredictable. This must be addressed.
     * this.year = this.$('.listing-key-specs ').find('li').first().text()
     * this.body = this.$('.listing-key-specs ').find('li').first().next().text()
     * etc, etc
     *
     * The following is a working alternative but does not allow for named referencing of each spec.
     *
     */
    this.keySpecs = this.$('.listing-key-specs ').find('li').map((i, el) => {
      return this.$(el).text().replace(/\n/g, '').trim()
    }).get()
    this.description = this.$('.listing-description').text()
    this.location = this.$('.seller-location').text().replace(/\n/g, '').trim()
    this.img = this.$('img').attr('src')
  }

  get() {
    return {
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    }
  }

  json() {
    return JSON.stringify({
      title: this.title,
      price: this.price,
      keySpecs: this.keySpecs,
      description: this.description,
      location: this.location,
      img: this.img
    })
  }
}

module.exports = AutoTraderScraper
