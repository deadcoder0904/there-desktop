// Packages
import electron from 'electron'
import React, { Component, Fragment } from 'react'
import { ConnectHOC, mutation, query } from 'urql'
import styled from 'styled-components'
import io from 'socket.io-client'
import compose from 'just-compose'
import compare from 'just-compare'
import Raven from 'raven-js'

// Utilities
import config from '../../config'
import { isLoggedIn, setUserAndToken } from '../utils/auth'
import { closeWindowAndShowMain } from '../utils/windows/helpers'
import provideTheme from '../utils/styles/provideTheme'
import provideUrql from '../utils/urql/provideUrql'
import { User } from '../utils/graphql/fragments'
import gql from '../utils/graphql/gql'

// Local
import ErrorBoundary from '../components/ErrorBoundary'
import WindowWrapper from '../components/window/WindowWrapper'
import ConnectionBar from '../components/window/ConnectionBar'
import TitleBar from '../components/window/TitleBar'
import SafeArea from '../components/window/SafeArea'
import Heading from '../components/window/Heading'
import Desc from '../components/window/Desc'
import Input from '../components/form/Input'
import Button from '../components/form/Button'
import MiniLogo from '../components/MiniLogo'
import ErrorText from '../components/form/ErrorText'
import LocationPicker from '../components/LocationPicker'
import { FieldWrapper } from '../components/form/Field'
import { TwitterButton } from '../components/SocialButtons'

class Join extends Component {
  constructor(props) {
    super(props)
    this.io = null
  }

  state = {
    signInError: null,
    signInLoading: false,
    signedIn: false,
    hasLocation: false,
    submittedEmail: false,
    enteredEmail: false,
    socketReady: false,
    // Data
    showWhySignIn: false,
    skippedLocation: false,
    email: '',
    emailError: null,
    place: null,
  }

  renderSignInMethods() {
    return (
      <div>
        {this.state.signInError && (
          <p>We couldn't verify by Twitter. 🙏 Try again please!</p>
        )}
        {this.state.signInLoading ? (
          <div>
            <p>Waiting for Twitter...</p>
            <Button onClick={this.twitterButtonClicked}>Reload</Button>
          </div>
        ) : this.state.socketReady ? (
          <TwitterButton onClick={this.twitterButtonClicked} />
        ) : (
          <Button style={{ padding: '10px 15px' }} disabled={true}>
            Initilizing Twitter ...
          </Button>
        )}
      </div>
    )
  }

  renderSignIn() {
    const { showWhySignIn } = this.state
    return (
      <Center>
        {showWhySignIn ? (
          <Fragment>
            <Heading>🤔 💡</Heading>
            <Heading>Why Sign In?</Heading>
            <Desc style={{ marginTop: 10 }}>
              We need to know 👩‍💻 who you are, and fetch your name and 😎 photo.
              There uses a secure ☁️ cloud to fetch your followings, and that
              enables ✈️ auto-update of people's timezone in your list. There
              will be a mobile app soon as well.
            </Desc>
            <Desc style={{ marginTop: 10, marginBottom: 30 }}>
              We DO NOT store any other data from your account like Twitter
              followings or your tweets, cause we don't need them!
            </Desc>
          </Fragment>
        ) : (
          <Fragment>
            <Heading>
              <MiniLogo size="45px" />
            </Heading>
            <Heading>Hello There!</Heading>
            <Desc style={{ marginTop: 10, opacity: 0.7 }}>
              Sorry for the interruption 🙌
            </Desc>

            <Desc style={{ marginTop: 10, marginBottom: 30 }}>
              It's necessary to fetch your name and photo, make your account,
              and enable following people's time. Why exactly?{' '}
              <a
                href="#"
                onClick={() => this.setState({ showWhySignIn: true })}
              >
                Read more →
              </a>
            </Desc>
          </Fragment>
        )}

        {this.renderSignInMethods()}
      </Center>
    )
  }

  renderLocation() {
    const { fetching } = this.props
    const { place } = this.state
    const placePicked = place !== null
    return (
      <Center>
        <Heading>⛺️ + ⏰</Heading>
        <Heading>Your location</Heading>
        <Desc style={{ marginTop: 10, marginBottom: 30 }}>
          We determine timezone based on your location.<br />You can update it
          or auto-update when travelling, and change privacy settings later in
          the app.
        </Desc>
        <div>
          {placePicked ? (
            <FieldWrapper moreTop={true}>
              <p onClick={this.clearPlace}>{place.description}</p>
            </FieldWrapper>
          ) : (
            <Fragment>
              <FieldWrapper moreTop={true}>
                <LocationPicker
                  grabFocusOnRerender={true}
                  onPick={this.placePicked}
                />
              </FieldWrapper>
            </Fragment>
          )}
        </div>
        {placePicked && (
          <FieldWrapper moreTop={true}>
            <Button onClick={this.clearPlace} disabled={fetching}>
              Edit
            </Button>&nbsp;
            <Button onClick={this.saveLocation} disabled={fetching}>
              {fetching ? '...' : 'Save'}
            </Button>
          </FieldWrapper>
        )}
      </Center>
    )
  }

  renderEmail() {
    const { fetching } = this.props
    const { emailError } = this.state
    return (
      <Center>
        <Heading>💌</Heading>
        <Heading>How to reach you?</Heading>
        <Desc style={{ marginTop: 10, marginBottom: 30 }} id="email-desc">
          I only may email you for important notes, and huge updates. No spam, I
          promise. 🤝 Unsubscribe anytime, though!
        </Desc>
        <form onSubmit={this.emailFormSubmitted}>
          <Input
            big={true}
            required={true}
            aria-label="Email"
            aria-describedby="email-desc"
            style={{ minWidth: 230, textAlign: 'center' }}
            placeholder="name@domain.com"
            value={this.state.email}
            onChange={this.emailChanged}
          />
          {emailError && (
            <p>
              <ErrorText>{emailError}</ErrorText>
            </p>
          )}
          <FieldWrapper moreTop={true}>
            <Button disabled={fetching}>{fetching ? '...' : 'Done'}</Button>
          </FieldWrapper>
        </form>
      </Center>
    )
  }

  renderAlreadyIn() {
    return (
      <Center>
        <Heading>🙌</Heading>
        <Heading>You're in, my friend!</Heading>
        <FieldWrapper moreTop={true}>
          <Button onClick={this.closeWindow}>Close this window</Button>
        </FieldWrapper>
      </Center>
    )
  }

  renderContent() {
    const { hasLocation, enteredEmail, signedIn, skippedLocation } = this.state

    if (!signedIn) {
      return <Fragment>{this.renderSignIn()}</Fragment>
    } else if (!hasLocation && !skippedLocation) {
      return <Fragment>{this.renderLocation()}</Fragment>
    } else if (!enteredEmail) {
      return <Fragment>{this.renderEmail()}</Fragment>
    } else {
      return <Fragment>{this.renderAlreadyIn()}</Fragment>
    }
  }

  render() {
    return (
      <ErrorBoundary>
        <WindowWrapper flex={true}>
          <ConnectionBar />
          <TitleBar />
          <SafeArea>
            <FlexWrapper>{this.renderContent()}</FlexWrapper>
          </SafeArea>
        </WindowWrapper>
      </ErrorBoundary>
    )
  }

  componentWillMount() {
    this.setState({ signedIn: isLoggedIn() })
  }

  componentDidMount() {
    this.socket = io(config.apiUrl)
    this.socket.once('connect', () => this.setState({ socketReady: true }))
    this.socket.on('error', err => {
      console.log('Socket for Twitter auth disconnected:', err)
      Raven.captureException(err)
    })
  }

  componentWillReceiveProps({ loaded, data }) {
    if (data && data.user) {
      const sender = electron.ipcRenderer || false

      if (!sender) {
        return
      }

      if (
        this.props.data &&
        this.props.loaded === loaded &&
        this.props.data.user.email !== data.user.email
      ) {
        // Email mututation finished and it is
        // successfully submitted
        this.setState({ enteredEmail: true })
        closeWindowAndShowMain()
        return
      }

      if (this.props.data && !compare(data.user, this.props.data.user)) {
        sender.send('reload-main')
      }

      this.setState(this.getNewStateBasedOnUser(data.user))
    }
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }

  getNewStateBasedOnUser = user => {
    return {
      enteredEmail: !!user.email,
      hasLocation:
        Boolean(user.city) &&
        Boolean(user.timezone) &&
        Boolean(user.fullLocation),
    }
  }

  closeWindow = () => {
    closeWindowAndShowMain()
  }

  twitterButtonClicked = () => {
    this.signIn()
  }

  emailChanged = e => {
    this.setState({ email: e.target.value, emailError: null })
  }

  emailFormSubmitted = async e => {
    e.preventDefault()
    const { email } = this.state

    // Validate email
    if (!email || !email.includes('@') || !email.includes('.')) {
      this.setState({
        emailError: 'Please use a real email! 🙂',
      })
      return false
    }

    await this.props.updateEmail({ newEmail: email })
    this.setState({ submittedEmail: true })
    return false
  }

  placePicked = place => {
    this.setState({ place })
  }

  clearPlace = () => {
    this.setState({ place: null })
  }

  skipLocation = () => {
    this.setState({ skippedLocation: true })
  }

  saveLocation = () => {
    const { place } = this.state
    if (place && place.placeId) {
      this.props.updateLocation({ placeId: place.placeId })
    }
  }

  signIn = () => {
    if (this.socket) {
      this.setState({ signInLoading: true, signInError: false })
      // Open sign in by Twitter
      electron.shell.openExternal(
        `${config.apiUrl}/auth/twitter?socketId=${this.socket.id}`
      )
      // Listen for the token
      this.socket.on('signin-succeeded', ({ jwtToken: token, user }) => {
        // Save user
        setUserAndToken({ user, token })
        this.props.refetch({ skipCache: true })
        this.setState({
          signedIn: true,
          signInLoading: false,
          // Skip email and location steps if
          // user has already filled them in
          ...this.getNewStateBasedOnUser(user),
        })
      })
      // Or failure!
      this.socket.on('signin-failed', () => {
        console.log('SignIn failed :(')
        this.setState({ signInLoading: false, signInError: true })
      })
      // Or disconnected?
      this.socket.on('disconnect', () => {
        this.setState({ signInLoading: false, socketReady: false })
      })
    }
  }
}

const UpdateEmail = mutation(gql`
  mutation($newEmail: String) {
    updateUser(email: $newEmail) {
      ...User
    }
  }
  ${User}
`)

const UpdateLocation = mutation(gql`
  mutation($placeId: ID!) {
    updateLocationAndTimezone(placeId: $placeId) {
      ...User
    }
  }
  ${User}
`)

const GetUser = query(gql`
  query {
    user {
      ...User
    }
  }
  ${User}
`)

export default compose(
  ConnectHOC({
    query: GetUser,
    mutation: { updateEmail: UpdateEmail, updateLocation: UpdateLocation },
  }),
  provideUrql,
  provideTheme
)(Join)

// STYLES
const FlexWrapper = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
`

const Center = styled.div`
  text-align: center;

  svg {
    fill: blue;
  }
`
