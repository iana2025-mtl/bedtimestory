export type Language = 'en' | 'fr';

export interface Translations {
  header: {
    title: string;
    subtitle: string;
  };
  form: {
    welcome: string;
    welcomeDescription: string;
    childrenNamesAges: string;
    name: string;
    age: string;
    namePlaceholder: string;
    agePlaceholder: string;
    charactersQuestion: string;
    themesQuestion: string;
    storyLengthQuestion: string;
    includeImagesQuestion: string;
    yes: string;
    no: string;
    photoUpload: string;
    photoDescription: string;
    visualStyleQuestion: string;
    generateStory: string;
    somethingElse: string;
    clickToUpload: string;
    clickToChangePhoto: string;
    fileTypes: string;
  };
  story: {
    newStory: string;
    storyCover: string;
    storyText: string;
    generatingStory: string;
    generatingImage: string;
    coverPlaceholder: string;
    imagesNotRequested: string;
    storyPlaceholder: string;
    mayTakeMoment: string;
  };
  options: {
    characters: string[];
    themes: string[];
    visualStyles: string[];
    storyLengths: string[];
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    header: {
      title: 'No More Night Time Fussies',
      subtitle: 'Bedtime Story Generator',
    },
    form: {
      welcome: 'Welcome!',
      welcomeDescription: 'Create a personalized bedtime story for your children. Fill out the form below to get started.',
      childrenNamesAges: "What Are Your Children's Names and Ages?",
      name: 'Name',
      age: 'Age',
      namePlaceholder: "Child's name",
      agePlaceholder: 'Age',
      charactersQuestion: 'What kind of characters or themes do they enjoy?',
      themesQuestion: 'What themes are you trying to teach?',
      storyLengthQuestion: 'How Long Do You Want the Story To Be?',
      includeImagesQuestion: 'Would you like to include images?',
      yes: 'Yes',
      no: 'No',
      photoUpload: 'Please Upload a Photo of Your Children',
      photoDescription: 'Describe Which Child is Which in the Photo',
      visualStyleQuestion: 'What Visual Style Might Your Child Like?',
      generateStory: 'Generate Story ✨',
      somethingElse: 'Something Else',
      clickToUpload: 'Click to upload photo',
      clickToChangePhoto: 'Click to change photo',
      fileTypes: 'PNG, JPG, GIF up to 10MB',
    },
    story: {
      newStory: 'New Story',
      storyCover: 'Story Cover',
      storyText: 'Story Text',
      generatingStory: 'Generating your personalized story...',
      generatingImage: 'Generating stylized image...',
      coverPlaceholder: 'Story cover will appear here',
      imagesNotRequested: 'Images were not requested',
      storyPlaceholder: 'Your personalized story will be generated here',
      mayTakeMoment: 'This may take a few moments',
    },
    options: {
      characters: ['Princesses', 'Superheroes', 'Animals', 'Dragons'],
      themes: ['Kindness', 'Bravery', 'Friendship', 'Honesty'],
      visualStyles: ['Cartoon', 'Realistic', 'Fantasy', 'Modern'],
      storyLengths: ['3-5 Mins', '5-10 Mins', '10-15 Mins', '15-20 Mins'],
    },
  },
  fr: {
    header: {
      title: 'Fini les Caprices au Coucher',
      subtitle: 'Générateur d\'Histoires du Soir',
    },
    form: {
      welcome: 'Bienvenue !',
      welcomeDescription: 'Créez une histoire du soir personnalisée pour vos enfants. Remplissez le formulaire ci-dessous pour commencer.',
      childrenNamesAges: 'Quels sont les noms et âges de vos enfants ?',
      name: 'Nom',
      age: 'Âge',
      namePlaceholder: 'Nom de l\'enfant',
      agePlaceholder: 'Âge',
      charactersQuestion: 'Quels types de personnages ou thèmes apprécient-ils ?',
      themesQuestion: 'Quels thèmes essayez-vous d\'enseigner ?',
      storyLengthQuestion: 'Quelle longueur souhaitez-vous pour l\'histoire ?',
      includeImagesQuestion: 'Souhaitez-vous inclure des images ?',
      yes: 'Oui',
      no: 'Non',
      photoUpload: 'Veuillez télécharger une photo de vos enfants',
      photoDescription: 'Décrivez quel enfant est lequel sur la photo',
      visualStyleQuestion: 'Quel style visuel pourrait plaire à votre enfant ?',
      generateStory: 'Générer l\'Histoire ✨',
      somethingElse: 'Autre chose',
      clickToUpload: 'Cliquez pour télécharger une photo',
      clickToChangePhoto: 'Cliquez pour changer la photo',
      fileTypes: 'PNG, JPG, GIF jusqu\'à 10 Mo',
    },
    story: {
      newStory: 'Nouvelle Histoire',
      storyCover: 'Couverture de l\'Histoire',
      storyText: 'Texte de l\'Histoire',
      generatingStory: 'Génération de votre histoire personnalisée...',
      generatingImage: 'Génération de l\'image stylisée...',
      coverPlaceholder: 'La couverture de l\'histoire apparaîtra ici',
      imagesNotRequested: 'Les images n\'ont pas été demandées',
      storyPlaceholder: 'Votre histoire personnalisée sera générée ici',
      mayTakeMoment: 'Cela peut prendre quelques instants',
    },
    options: {
      characters: ['Princesses', 'Super-héros', 'Animaux', 'Dragons'],
      themes: ['Gentillesse', 'Courage', 'Amitié', 'Honnêteté'],
      visualStyles: ['Dessin animé', 'Réaliste', 'Fantastique', 'Moderne'],
      storyLengths: ['3-5 Min', '5-10 Min', '10-15 Min', '15-20 Min'],
    },
  },
};

