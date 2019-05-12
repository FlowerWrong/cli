import helpers from './index';

const Sequelize = helpers.generic.getSequelize();
const validAttributeFunctionType = ['array', 'enum'];

/**
 * Check the given dataType actual exists.
 * @param {string} dataType
 */
function validateDataType (dataType) {
  if (!Sequelize.DataTypes[dataType.toUpperCase()]) {
    throw new Error(`Unknown type '${dataType}'`);
  }

  return dataType;
}

// https://github.com/sequelize/sequelize/blob/master/docs/data-types.md
// https://graphql.org/graphql-js/basic-types/
function sequelizeType2GraphqlType (dataType) {
  var t = dataType;
  switch(dataType) {
    case 'integer':
      t = 'Int'
      break;
    case 'date':
      t = 'Int'
      break;
    case 'float':
      t = 'Float'
      break;
    case 'double':
      t = 'Float'
      break;
    default:
      t = 'String';
  }
  return t;
}

function formatAttributes (attribute) {
  let result;
  const split = attribute.split(':');

  if (split.length === 2) {
    result = { fieldName: split[0], dataType: split[1], dataFunction: null, dataValues: null };
  } else if (split.length === 3) {
    const validValues = /^\{(,? ?[A-z0-9 ]+)+\}$/;
    const isValidFunction = validAttributeFunctionType.indexOf(split[1].toLowerCase()) !== -1;
    const isValidValue = validAttributeFunctionType.indexOf(split[2].toLowerCase()) === -1 && split[2].match(validValues) === null;
    const isValidValues = split[2].match(validValues) !== null;

    if (isValidFunction && isValidValue && !isValidValues) {
      result = { fieldName: split[0], dataType: split[2], dataFunction: split[1], dataValues: null };
    }

    if (isValidFunction && !isValidValue && isValidValues) {
      result = { fieldName: split[0], dataType: split[1], dataFunction: null, dataValues: split[2].replace(/(^\{|\}$)/g, '').split(/\s*,\s*/).map(s => `'${s}'`).join(', ') };
    }
  }

  return result;
}

module.exports = {
  transformAttributes (flag) {
    /*
      possible flag formats:
      - first_name:string,last_name:string,bio:text,role:enum:{Admin, 'Guest User'},reviews:array:string
      - 'first_name:string last_name:string bio:text role:enum:{Admin, Guest User} reviews:array:string'
      - 'first_name:string, last_name:string, bio:text, role:enum:{Admin, Guest User} reviews:array:string'
    */
    const attributeStrings = flag.split('').map((() => {
      let openValues = false;
      return a => {
        if ((a === ',' || a === ' ') && !openValues) {
          return '  ';
        }
        if (a === '{') {
          openValues = true;
        }
        if (a === '}') {
          openValues = false;
        }

        return a;
      };
    })()).join('').split(/\s{2,}/);

    return attributeStrings.map(attribute => {
      const formattedAttribute = formatAttributes(attribute);

      try {
        validateDataType(formattedAttribute.dataType);
      } catch (err) {
        throw new Error(`Attribute '${attribute}' cannot be parsed: ${err.message}`);
      }
      formattedAttribute.dataType = sequelizeType2GraphqlType(formattedAttribute.dataType)
      return formattedAttribute;
    });
  },

  generateFileContent (args) {
    console.log(this.transformAttributes(args.attributes));
    return helpers.template.render('graphqls/create-schema.js', {
      name:       args.name,
      attributes: this.transformAttributes(args.attributes),
      underscored: args.underscored
    });
  },

  generateFile (args) {
    const graphqlPath = helpers.path.getGraphqlPath(args.name);
    helpers.asset.write(graphqlPath, this.generateFileContent(args));
  },

  graphqlFileExists (filePath) {
    return helpers.path.existsSync(filePath);
  }
};
