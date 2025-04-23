Rails.application.routes.draw do
  root 'chat_threads#index'
  resources :chat_threads, only: [:index, :create, :show] do
    resources :messages, only: [:create]
  end
end
