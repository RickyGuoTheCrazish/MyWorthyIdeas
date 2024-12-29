// /db/ideaModel.js
const { mongoose } = require("./connection");

// For example, the custom validator approach
const VALID_MAIN_CATEGORIES = [
    "Technology",
    "Games",
    "Business",
    "Life",
    "Arts & Design",
    "Science",
    "Health & Wellness",
    "Other"
];

const SUBCATS_BY_MAIN = {
    "Technology": ["Computer", "Assembly", "Electrical Engineering", "Artificial Intelligence", "Software Development", "Networking & Security", "Other"],
    "Games": ["Video Games", "Board & Card Games", "RPGs", "Mobile Games", "eSports", "Other"],
    "Business": ["Startups & Entrepreneurship", "Marketing & Sales", "eCommerce", "Management & Leadership", "Finance & Investing", "Other"],
    "Life": ["Personal Development", "Relationships & Family", "Travel & Leisure", "Hobbies & DIY", "Culture & Society", "Other"],
    "Arts & Design": ["Painting & Drawing", "Graphic Design & Illustration", "Photography & Film", "Architecture & Interior Design", "Fashion & Textiles", "Other"],
    "Science": ["Biology & Ecology", "Chemistry & Materials", "Physics & Astronomy", "Earth Science & Geology", "Research Methods & Academia", "Other"],
    "Health & Wellness": ["Fitness & Exercise", "Nutrition & Diet", "Mental Health", "Holistic & Alternative", "Medical & Anatomy", "Other"],
    "Other": ["Other"]
};

const ideaSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        preview: { type: String, required: true },
        contentRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
        contentHtml: { type: String, default: "" },
        price: { type: Number, required: true },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        isSold: { type: Boolean, default: false },
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        boughtAt: { type: Date, default: null },
        thumbnailImage: { type: String, default: "" },
        contentImages: [{ type: String }],
        rating: { type: Number, min: 0, max: 5, default: null },
        comment: {
            type: String,
            default: ""
        },
        
        category: {
            main: {
                type: String,
                enum: VALID_MAIN_CATEGORIES,
                default: "Other",
            },
            sub: {
                type: String,
                default: "Other",
                validate: {
                    validator: function (value) {
                        const chosenMain = this.category.main;
                        // If the chosen main isn't in the map, fail
                        if (!SUBCATS_BY_MAIN[chosenMain]) return false;
                        // Check that 'value' is in the array of valid subcats for that main
                        return SUBCATS_BY_MAIN[chosenMain].includes(value);
                    },
                    message: props =>
                        `'${props.value}' is not a valid subcategory for main category '${props.instance?.category?.main}'.`
                }
            }
        },
    },
    { timestamps: true }
);

const IdeaModel = mongoose.model("Idea", ideaSchema);
module.exports = IdeaModel;
